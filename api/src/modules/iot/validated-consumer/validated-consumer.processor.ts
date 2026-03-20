import { Injectable, Logger } from '@nestjs/common';
import { SpanKind } from '@opentelemetry/api';

import {
  extractContextFromTraceCarrier,
  withActiveSpan,
} from '../../../observability/tracing.helpers.js';

import {
  VALIDATED_EVENT_CONSUMER_MAX_RETRIES,
  type ClaimedValidatedEventDelivery,
} from './validated-consumer.contracts.js';
import { ValidatedConsumerRepository } from './validated-consumer.repository.js';

@Injectable()
export class ValidatedConsumerProcessorService {
  private readonly logger = new Logger(ValidatedConsumerProcessorService.name);

  constructor(private readonly repository: ValidatedConsumerRepository) {}

  async processDelivery(deliveryId: string, consumerName: string) {
    const claimedDelivery = await this.repository.claimDeliveryForProcessing(deliveryId, consumerName);
    if (!claimedDelivery) {
      return { status: 'skipped' as const };
    }

    const parentContext = extractContextFromTraceCarrier({
      traceparent: claimedDelivery.traceparent,
      tracestate: claimedDelivery.tracestate,
    });

    return withActiveSpan(
      'iot.validated_consumer.process',
      async () => this.processClaimedDelivery(claimedDelivery),
      {
        kind: SpanKind.CONSUMER,
        parentContext,
        attributes: {
          'iot.delivery_id': claimedDelivery.id,
          'iot.validated_event_id': claimedDelivery.validatedEventId,
          'iot.consumer_name': claimedDelivery.consumerName,
          'iot.delivery_attempt': claimedDelivery.attemptCount,
        },
      },
    );
  }

  private async processClaimedDelivery(delivery: ClaimedValidatedEventDelivery) {
    try {
      await this.repository.projectValidatedEvent(delivery);
      await this.repository.markCompleted(delivery.id);
      return { status: 'completed' as const };
    } catch (error) {
      const nextAttemptAt = this.computeNextAttemptAt(delivery.attemptCount);
      const errorMessage = error instanceof Error ? error.message : 'Unknown validated-event processing error';

      await this.repository.markRetryOrFailed(
        delivery.id,
        delivery.attemptCount,
        errorMessage,
        nextAttemptAt,
      );

      this.logger.error(
        `Failed processing validated-event delivery ${delivery.id}: ${errorMessage}`,
      );

      return {
        status:
          delivery.attemptCount >= VALIDATED_EVENT_CONSUMER_MAX_RETRIES
            ? ('failed' as const)
            : ('retry' as const),
      };
    }
  }

  private computeNextAttemptAt(attemptCount: number) {
    const retryIndex = Math.max(0, attemptCount - 1);
    const backoffMs = Math.min(30_000, 1_000 * 2 ** retryIndex);
    return new Date(Date.now() + backoffMs);
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { SpanKind } from '@opentelemetry/api';

import { withActiveSpan } from '../../observability/tracing.helpers.js';

import type { BillingFinalizeOptions, BillingPreviewRequest } from './billing.contracts.js';
import { BillingRepository } from './billing.repository.js';
import type { BillingRunDto } from './dto/billing-run.dto.js';
import type { CreateBillingAccountDto } from './dto/create-billing-account.dto.js';
import type { UpsertBillingRateRuleDto } from './dto/upsert-billing-rate-rule.dto.js';

@Injectable()
export class BillingService {
  constructor(private readonly repository: BillingRepository) {}

  async listAccounts() {
    return withActiveSpan(
      'billing.accounts.list',
      () => this.repository.listAccounts(),
      {
        kind: SpanKind.INTERNAL,
      },
    );
  }

  async createAccount(dto: CreateBillingAccountDto) {
    return withActiveSpan(
      'billing.accounts.create',
      () =>
        this.repository.createAccount({
          name: dto.name,
          scopeType: dto.scopeType,
          scopeKey: dto.scopeKey,
          currency: dto.currency,
        }),
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'billing.scope_type': dto.scopeType,
          'billing.scope_key': dto.scopeKey,
        },
      },
    );
  }

  async upsertRateRule(billingAccountId: string, dto: UpsertBillingRateRuleDto) {
    if (dto.sourceType === 'alert_event' && dto.unit !== 'event') {
      throw new BadRequestException('Alert-event billing rules support event pricing only.');
    }

    return withActiveSpan(
      'billing.rate_rule.upsert',
      () =>
        this.repository.upsertRateRule(billingAccountId, {
          chargeType: dto.chargeType,
          sourceType: dto.sourceType,
          unit: dto.unit,
          unitPriceCents: dto.unitPriceCents,
          description: dto.description,
          filters: dto.filters,
          isPenalty: dto.isPenalty,
          isActive: dto.isActive,
        }),
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'billing.account_id': billingAccountId,
          'billing.charge_type': dto.chargeType,
          'billing.source_type': dto.sourceType,
        },
      },
    );
  }

  async previewRun(dto: BillingRunDto) {
    const request = this.normalizeRunRequest(dto);

    return withActiveSpan(
      'billing.run.preview',
      () => this.repository.getPreview(request),
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'billing.account_id': request.billingAccountId,
        },
      },
    );
  }

  async finalizeRun(dto: BillingRunDto, actorUserId: string, options?: BillingFinalizeOptions) {
    const request = this.normalizeRunRequest(dto);

    return withActiveSpan(
      'billing.run.finalize',
      async () => {
        const preview = await this.repository.getPreview(request);

        if (preview.lineItems.length === 0) {
          throw new BadRequestException('No billable sources were found for the requested billing period.');
        }

        return this.repository.finalizePreview(preview, actorUserId, options);
      },
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'billing.account_id': request.billingAccountId,
        },
      },
    );
  }

  async listInvoices(filters: { billingAccountId?: string; limit: number }) {
    return withActiveSpan(
      'billing.invoices.list',
      () => this.repository.listInvoices(filters),
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'billing.limit': filters.limit,
          'billing.account_filter': filters.billingAccountId ?? 'all',
        },
      },
    );
  }

  async getInvoiceById(invoiceId: string) {
    return withActiveSpan(
      'billing.invoices.get',
      () => this.repository.getInvoiceById(invoiceId),
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'billing.invoice_id': invoiceId,
        },
      },
    );
  }

  private normalizeRunRequest(dto: BillingRunDto): BillingPreviewRequest {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    if (Number.isNaN(periodStart.valueOf()) || Number.isNaN(periodEnd.valueOf())) {
      throw new BadRequestException('Billing period dates must be valid ISO timestamps.');
    }

    if (periodStart >= periodEnd) {
      throw new BadRequestException('periodStart must be earlier than periodEnd.');
    }

    return {
      billingAccountId: dto.billingAccountId,
      periodStart,
      periodEnd,
    };
  }
}

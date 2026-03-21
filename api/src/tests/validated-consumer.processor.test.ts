import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidatedConsumerProcessorService } from '../modules/iot/validated-consumer/validated-consumer.processor.js';

const createClaimedDelivery = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'delivery-1',
  validatedEventId: 'validated-event-1',
  consumerName: 'timeseries_projection',
  traceparent: null,
  tracestate: null,
  attemptCount: 1,
  measuredAt: new Date('2026-03-20T10:00:00.000Z'),
  sensorDeviceId: 'sensor-1',
  containerId: 'container-1',
  fillLevelPercent: 72,
  temperatureC: 22,
  batteryPercent: 80,
  signalStrength: -75,
  measurementQuality: 'valid',
  warningThreshold: 75,
  criticalThreshold: 90,
  normalizedPayload: { source: 'iot-ingestion-api' },
  emittedAt: new Date('2026-03-20T10:00:01.000Z'),
  ...overrides,
});

describe('ValidatedConsumerProcessorService', () => {
  const repositoryMock = {
    claimDeliveryForProcessing: vi.fn(),
    projectValidatedEvent: vi.fn(),
    markCompleted: vi.fn(),
    markRetryOrFailed: vi.fn(),
  };

  let service: ValidatedConsumerProcessorService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ValidatedConsumerProcessorService(repositoryMock as any);
    vi.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  });

  it('skips deliveries that are already claimed elsewhere', async () => {
    repositoryMock.claimDeliveryForProcessing.mockResolvedValueOnce(null);

    await expect(service.processDelivery('delivery-1', 'timeseries_projection')).resolves.toEqual({
      status: 'skipped',
    });

    expect(repositoryMock.projectValidatedEvent).not.toHaveBeenCalled();
    expect(repositoryMock.markCompleted).not.toHaveBeenCalled();
  });

  it('projects and completes claimed deliveries', async () => {
    repositoryMock.claimDeliveryForProcessing.mockResolvedValueOnce(createClaimedDelivery());
    repositoryMock.projectValidatedEvent.mockResolvedValueOnce({ measurementId: 'measurement-1' });
    repositoryMock.markCompleted.mockResolvedValueOnce(undefined);

    await expect(service.processDelivery('delivery-1', 'timeseries_projection')).resolves.toEqual({
      status: 'completed',
    });

    expect(repositoryMock.projectValidatedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'delivery-1',
        validatedEventId: 'validated-event-1',
      }),
    );
    expect(repositoryMock.markCompleted).toHaveBeenCalledWith('delivery-1');
  });

  it('marks retryable failures below the retry ceiling', async () => {
    repositoryMock.claimDeliveryForProcessing.mockResolvedValueOnce(
      createClaimedDelivery({ attemptCount: 2 }),
    );
    repositoryMock.projectValidatedEvent.mockRejectedValueOnce(new Error('projection failed'));
    repositoryMock.markRetryOrFailed.mockResolvedValueOnce(undefined);

    await expect(service.processDelivery('delivery-1', 'timeseries_projection')).resolves.toEqual({
      status: 'retry',
    });

    expect(repositoryMock.markRetryOrFailed).toHaveBeenCalledWith(
      'delivery-1',
      2,
      'projection failed',
      expect.any(Date),
    );
  });

  it('marks deliveries as failed once the retry budget is exhausted', async () => {
    repositoryMock.claimDeliveryForProcessing.mockResolvedValueOnce(
      createClaimedDelivery({ attemptCount: 3 }),
    );
    repositoryMock.projectValidatedEvent.mockRejectedValueOnce(new Error('projection failed'));
    repositoryMock.markRetryOrFailed.mockResolvedValueOnce(undefined);

    await expect(service.processDelivery('delivery-1', 'timeseries_projection')).resolves.toEqual({
      status: 'failed',
    });
  });
});

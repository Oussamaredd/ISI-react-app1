import { afterEach, describe, expect, it, vi } from 'vitest';

import { InMemoryValidatedDeliveryQueue } from '../modules/iot/validated-consumer/validated-consumer.queue.js';

const flushQueue = async (ticks = 8) => {
  for (let index = 0; index < ticks; index += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
};

describe('InMemoryValidatedDeliveryQueue', () => {
  let queue: InMemoryValidatedDeliveryQueue | undefined;

  afterEach(() => {
    queue?.onModuleDestroy();
    queue = undefined;
    vi.restoreAllMocks();
  });

  it('batches deliveries up to the configured maximum', async () => {
    queue = new InMemoryValidatedDeliveryQueue();
    queue.onModuleInit();
    const handler = vi.fn().mockResolvedValue(undefined);

    await queue.enqueue(['delivery-prestart']);
    queue.startProcessor(handler, { concurrency: 1, maxBatchDeliveries: 3 });
    await queue.enqueue(['delivery-1']);
    await queue.enqueue(['delivery-2', 'delivery-3']);
    await queue.enqueue(['delivery-4']);

    await flushQueue();

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[0]?.[0].flatMap((job: { deliveryIds: string[] }) => job.deliveryIds)).toEqual([
      'delivery-prestart',
      'delivery-1',
    ]);
    expect(handler.mock.calls[1]?.[0].flatMap((job: { deliveryIds: string[] }) => job.deliveryIds)).toEqual([
      'delivery-2',
      'delivery-3',
      'delivery-4',
    ]);
  });

  it('requeues failed batches and retries them', async () => {
    queue = new InMemoryValidatedDeliveryQueue();
    const loggerErrorSpy = vi
      .spyOn((queue as any).logger, 'error')
      .mockImplementation(() => undefined);
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new Error('queue unavailable'))
      .mockResolvedValueOnce(undefined);

    queue.startProcessor(handler, { concurrency: 1, maxBatchDeliveries: 10 });
    await queue.enqueue(['delivery-1', 'delivery-2']);

    await flushQueue();

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[0]?.[0][0].deliveryIds).toEqual(['delivery-1', 'delivery-2']);
    expect(handler.mock.calls[1]?.[0][0].deliveryIds).toEqual(['delivery-1', 'delivery-2']);
    expect(loggerErrorSpy).toHaveBeenCalled();
  });
});

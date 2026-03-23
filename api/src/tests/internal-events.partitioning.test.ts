import { describe, expect, it } from 'vitest';

import {
  computeInternalEventShardId,
  normalizeInternalEventRoutingKey,
} from '../modules/events/internal-events.partitioning.js';

describe('internal event partitioning', () => {
  it('normalizes blank routing keys to a stable default', () => {
    expect(normalizeInternalEventRoutingKey(undefined)).toBe('default');
    expect(normalizeInternalEventRoutingKey(null)).toBe('default');
    expect(normalizeInternalEventRoutingKey('   ')).toBe('default');
    expect(normalizeInternalEventRoutingKey(' sensor-001 ')).toBe('sensor-001');
  });

  it('hashes routing keys into a bounded shard id deterministically', () => {
    const first = computeInternalEventShardId('sensor-001', 8);
    const second = computeInternalEventShardId('sensor-001', 8);

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(8);
    expect(computeInternalEventShardId('', 0)).toBe(0);
  });
});

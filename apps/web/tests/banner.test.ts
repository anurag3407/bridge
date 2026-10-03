import { describe, it, expect } from 'vitest';
import { calculateFreshness } from '@bridge/domain';
import { BridgeCondition, FreshnessState } from '@bridge/contracts';

describe('Web Status Derivation Tests', () => {
  it('correctly maps report status to freshness states', () => {
    const now = new Date();
    const freshDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
    const staleDate = new Date(now.getTime() - 1000 * 60 * 60 * 48); // 48 hours ago

    expect(calculateFreshness(BridgeCondition.NORMAL, freshDate, 86400, now)).toBe(
      FreshnessState.FRESH
    );
    expect(calculateFreshness(BridgeCondition.NORMAL, staleDate, 86400, now)).toBe(
      FreshnessState.STALE
    );
    expect(calculateFreshness(BridgeCondition.UNKNOWN, freshDate, 86400, now)).toBe(
      FreshnessState.UNREPORTED
    );
  });
});

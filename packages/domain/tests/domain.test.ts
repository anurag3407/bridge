import { describe, it, expect } from 'vitest';
import {
  BridgeCondition,
  BridgeLifecycle,
  FreshnessState,
} from '@bridge/contracts';
import {
  validateConditionTransition,
  compareRevisions,
  incrementRevision,
  assertExpectedRevision,
  calculateFreshness,
  computeIdempotencyHash,
  DomainError,
  InvalidTransitionError,
  StaleRevisionError,
} from '../src';

describe('Domain Rules & Transitions', () => {
  it('rejects reports on retired bridges', () => {
    expect(() =>
      validateConditionTransition({
        currentCondition: BridgeCondition.UNKNOWN,
        newCondition: BridgeCondition.NORMAL,
        reason: 'Inspection complete',
        lifecycle: BridgeLifecycle.RETIRED,
      })
    ).toThrow(DomainError);
  });

  it('requires a private reason when reporting BROKEN or DANGER', () => {
    expect(() =>
      validateConditionTransition({
        currentCondition: BridgeCondition.NORMAL,
        newCondition: BridgeCondition.BROKEN,
        reason: '',
        lifecycle: BridgeLifecycle.PUBLISHED,
      })
    ).toThrow(InvalidTransitionError);

    expect(() =>
      validateConditionTransition({
        currentCondition: BridgeCondition.NORMAL,
        newCondition: BridgeCondition.DANGER,
        reason: '   ',
        lifecycle: BridgeLifecycle.PUBLISHED,
      })
    ).toThrow(InvalidTransitionError);
  });

  it('requires a resolution reason when transitioning from BROKEN to NORMAL', () => {
    expect(() =>
      validateConditionTransition({
        currentCondition: BridgeCondition.BROKEN,
        newCondition: BridgeCondition.NORMAL,
        reason: '',
        lifecycle: BridgeLifecycle.PUBLISHED,
      })
    ).toThrow(InvalidTransitionError);

    expect(() =>
      validateConditionTransition({
        currentCondition: BridgeCondition.BROKEN,
        newCondition: BridgeCondition.NORMAL,
        reason: 'Pothole patched and surface inspected',
        lifecycle: BridgeLifecycle.PUBLISHED,
      })
    ).not.toThrow();
  });

  it('allows same-condition reports as explicit re-inspections', () => {
    expect(() =>
      validateConditionTransition({
        currentCondition: BridgeCondition.NORMAL,
        newCondition: BridgeCondition.NORMAL,
        reason: 'Routine daily check complete',
        lifecycle: BridgeLifecycle.PUBLISHED,
      })
    ).not.toThrow();
  });
});

describe('Revision Handling (BigInt strings)', () => {
  it('correctly compares large revision strings', () => {
    expect(compareRevisions('100', '99')).toBe(1);
    expect(compareRevisions('100', '100')).toBe(0);
    expect(compareRevisions('9007199254740992', '9007199254740993')).toBe(-1);
  });

  it('increments revisions monotonically', () => {
    expect(incrementRevision('0')).toBe('1');
    expect(incrementRevision('9007199254740991')).toBe('9007199254740992');
  });

  it('asserts expected revision matches actual revision', () => {
    expect(() => assertExpectedRevision('5', '5')).not.toThrow();
    expect(() => assertExpectedRevision('5', '4')).toThrow(StaleRevisionError);
  });
});

describe('Freshness Calculation', () => {
  const now = new Date('2026-10-03T12:00:00Z');

  it('marks UNKNOWN or null report as unreported', () => {
    expect(calculateFreshness(BridgeCondition.UNKNOWN, null, 86400, now)).toBe(
      FreshnessState.UNREPORTED
    );
  });

  it('marks recent reports as fresh', () => {
    const recent = new Date('2026-10-03T11:00:00Z');
    expect(calculateFreshness(BridgeCondition.NORMAL, recent, 86400, now)).toBe(
      FreshnessState.FRESH
    );
  });

  it('marks reports older than threshold as stale', () => {
    const staleDate = new Date('2026-10-01T12:00:00Z');
    expect(calculateFreshness(BridgeCondition.NORMAL, staleDate, 86400, now)).toBe(
      FreshnessState.STALE
    );
  });
});

describe('Idempotency Hashing', () => {
  it('generates consistent hashes for identical payloads regardless of key order', () => {
    const hash1 = computeIdempotencyHash('user-1', 'report', { a: 1, b: 'test' });
    const hash2 = computeIdempotencyHash('user-1', 'report', { b: 'test', a: 1 });
    expect(hash1).toBe(hash2);
  });

  it('generates different hashes for different payloads or actors', () => {
    const hash1 = computeIdempotencyHash('user-1', 'report', { a: 1 });
    const hash2 = computeIdempotencyHash('user-2', 'report', { a: 1 });
    const hash3 = computeIdempotencyHash('user-1', 'report', { a: 2 });
    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });
});

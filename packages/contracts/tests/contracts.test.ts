import { describe, it, expect } from 'vitest';
import {
  SubmitReportRequestSchema,
  CreateBridgeRequestSchema,
  BridgeCondition,
} from '../src';

describe('Contracts & Schema Validation', () => {
  it('validates a valid SubmitReportRequest', () => {
    const valid = {
      condition: BridgeCondition.NORMAL,
      reason: 'Standard inspection',
      publicNote: 'All clear',
      expectedRevision: '42',
    };
    const parsed = SubmitReportRequestSchema.parse(valid);
    expect(parsed.condition).toBe('NORMAL');
    expect(parsed.expectedRevision).toBe('42');
  });

  it('rejects decimal expectedRevision that is not digits', () => {
    const invalid = {
      condition: BridgeCondition.NORMAL,
      reason: 'Standard inspection',
      expectedRevision: 'abc',
    };
    expect(() => SubmitReportRequestSchema.parse(invalid)).toThrow();
  });

  it('validates CreateBridgeRequest requiring both coordinates or neither', () => {
    // Both coordinates provided -> valid
    expect(() =>
      CreateBridgeRequestSchema.parse({
        slug: 'test-bridge',
        displayName: 'Test Bridge',
        latitude: 45.0,
        longitude: -120.0,
      })
    ).not.toThrow();

    // Neither coordinate provided -> valid
    expect(() =>
      CreateBridgeRequestSchema.parse({
        slug: 'test-bridge',
        displayName: 'Test Bridge',
      })
    ).not.toThrow();

    // Only latitude provided -> invalid
    expect(() =>
      CreateBridgeRequestSchema.parse({
        slug: 'test-bridge',
        displayName: 'Test Bridge',
        latitude: 45.0,
      })
    ).toThrow();
  });
});

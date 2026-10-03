import { describe, it, expect, vi } from 'vitest';
import { Logger, MetricsCollector } from '../src';

describe('Observability Logger & Metrics', () => {
  it('records and summarizes metrics counters and percentiles', () => {
    const metrics = new MetricsCollector();
    metrics.increment('reports.submitted', 3);
    metrics.increment('reports.submitted', 2);

    metrics.record('api.latency_ms', 10);
    metrics.record('api.latency_ms', 20);
    metrics.record('api.latency_ms', 30);
    metrics.record('api.latency_ms', 100);

    const snapshot = metrics.getSnapshot();
    expect(snapshot['reports.submitted']).toBe(5);
    expect(snapshot['api.latency_ms'].count).toBe(4);
    expect(snapshot['api.latency_ms'].p50).toBe(30);
  });

  it('redacts sensitive fields in logger outputs', () => {
    const logger = new Logger('test');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('Test log', {
      user: 'alice',
      password: 'super-secret-password',
      token: 'jwt-bearer-token',
    });

    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('super-secret-password');
    expect(output).not.toContain('jwt-bearer-token');

    logSpy.mockRestore();
  });
});

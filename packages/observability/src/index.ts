export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const REDACT_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'service_role_key',
  'jwt_secret',
]);

function sanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACT_KEYS.has(key.toLowerCase()) || key.toLowerCase().includes('secret') || key.toLowerCase().includes('token')) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      result[key] = sanitize(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export class Logger {
  constructor(private context: string = 'bridge-platform') {}

  private log(level: LogLevel, message: string, meta?: Record<string, any>) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...(meta ? sanitize(meta) : {}),
    };

    const output = JSON.stringify(entry);
    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  debug(msg: string, meta?: Record<string, any>) {
    this.log('debug', msg, meta);
  }

  info(msg: string, meta?: Record<string, any>) {
    this.log('info', msg, meta);
  }

  warn(msg: string, meta?: Record<string, any>) {
    this.log('warn', msg, meta);
  }

  error(msg: string, meta?: Record<string, any>) {
    this.log('error', msg, meta);
  }

  child(context: string) {
    return new Logger(`${this.context}:${context}`);
  }
}

export const logger = new Logger('bridge');

// Metrics Collector
export class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  increment(metric: string, count: number = 1) {
    const current = this.counters.get(metric) || 0;
    this.counters.set(metric, current + count);
  }

  record(metric: string, value: number) {
    if (!this.histograms.has(metric)) {
      this.histograms.set(metric, []);
    }
    this.histograms.get(metric)!.push(value);
  }

  getSnapshot() {
    const result: Record<string, any> = {};
    for (const [k, v] of this.counters.entries()) {
      result[k] = v;
    }
    for (const [k, v] of this.histograms.entries()) {
      const sorted = [...v].sort((a, b) => a - b);
      const count = sorted.length;
      result[k] = {
        count,
        p50: sorted[Math.floor(count * 0.5)] || 0,
        p95: sorted[Math.floor(count * 0.95)] || 0,
        p99: sorted[Math.floor(count * 0.99)] || 0,
      };
    }
    return result;
  }
}

export const metrics = new MetricsCollector();

import { StaleRevisionError } from './errors';

export function compareRevisions(a?: string | null, b?: string | null): number {
  const cleanA = a && /^\d+$/.test(String(a)) ? String(a) : '0';
  const cleanB = b && /^\d+$/.test(String(b)) ? String(b) : '0';
  const bigA = BigInt(cleanA);
  const bigB = BigInt(cleanB);
  if (bigA > bigB) return 1;
  if (bigA < bigB) return -1;
  return 0;
}

export function incrementRevision(revision?: string | null): string {
  const clean = revision && /^\d+$/.test(String(revision)) ? String(revision) : '0';
  return (BigInt(clean) + 1n).toString();
}

export function assertExpectedRevision(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new StaleRevisionError(actual, expected);
  }
}

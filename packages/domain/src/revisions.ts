import { StaleRevisionError } from './errors';

export function compareRevisions(a: string, b: string): number {
  const bigA = BigInt(a);
  const bigB = BigInt(b);
  if (bigA > bigB) return 1;
  if (bigA < bigB) return -1;
  return 0;
}

export function incrementRevision(revision: string): string {
  return (BigInt(revision) + 1n).toString();
}

export function assertExpectedRevision(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new StaleRevisionError(actual, expected);
  }
}

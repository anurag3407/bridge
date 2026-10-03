import { createHash } from 'crypto';

export function computeIdempotencyHash(
  actorId: string,
  operation: string,
  payload: unknown
): string {
  const normalized = JSON.stringify(payload, Object.keys(payload as object || {}).sort());
  return createHash('sha256')
    .update(`${actorId}:${operation}:${normalized}`)
    .digest('hex');
}

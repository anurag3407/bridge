import { PoolClient } from 'pg';

export interface IdempotencyRecord {
  id: string;
  actorId: string;
  operation: string;
  idempotencyKey: string;
  requestHash: string;
  responseStatus: number;
  responseBody: any;
  createdAt: string;
  expiresAt: string;
}

export class IdempotencyRepository {
  async get(
    client: PoolClient,
    actorId: string,
    operation: string,
    key: string
  ): Promise<IdempotencyRecord | null> {
    const query = `
      SELECT id, actor_id, operation, idempotency_key, request_hash, response_status, response_body, created_at, expires_at
      FROM idempotency_records
      WHERE actor_id = $1 AND operation = $2 AND idempotency_key = $3 AND expires_at > NOW();
    `;
    const res = await client.query(query, [actorId, operation, key]);
    if (res.rows.length === 0) return null;

    const r = res.rows[0];
    return {
      id: r.id,
      actorId: r.actor_id,
      operation: r.operation,
      idempotencyKey: r.idempotency_key,
      requestHash: r.request_hash,
      responseStatus: r.response_status,
      responseBody: r.response_body,
      createdAt: new Date(r.created_at).toISOString(),
      expiresAt: new Date(r.expires_at).toISOString(),
    };
  }

  async save(
    client: PoolClient,
    actorId: string,
    operation: string,
    key: string,
    requestHash: string,
    status: number,
    body: any,
    ttlSeconds: number = 86400
  ): Promise<void> {
    const query = `
      INSERT INTO idempotency_records (
        actor_id, operation, idempotency_key, request_hash, response_status, response_body, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '1 second' * $7)
      ON CONFLICT (actor_id, operation, idempotency_key) DO UPDATE SET
        request_hash = EXCLUDED.request_hash,
        response_status = EXCLUDED.response_status,
        response_body = EXCLUDED.response_body,
        expires_at = EXCLUDED.expires_at;
    `;
    await client.query(query, [actorId, operation, key, requestHash, status, JSON.stringify(body), ttlSeconds]);
  }
}

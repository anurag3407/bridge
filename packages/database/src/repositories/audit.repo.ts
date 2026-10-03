import { PoolClient } from 'pg';
import { AuditEvent } from '@bridge/contracts';

export interface CreateAuditInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  requestId: string;
  outcome: 'success' | 'failure';
  metadata?: Record<string, any>;
}

export class AuditRepository {
  async record(client: PoolClient, input: CreateAuditInput): Promise<string> {
    const query = `
      INSERT INTO audit_events (
        actor_id, action, entity_type, entity_id, request_id, outcome, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const res = await client.query(query, [
      input.actorId || null,
      input.action,
      input.entityType,
      input.entityId,
      input.requestId,
      input.outcome,
      JSON.stringify(input.metadata || {}),
    ]);
    return res.rows[0].id;
  }

  async list(client: PoolClient, limit: number = 50): Promise<AuditEvent[]> {
    const query = `
      SELECT id, actor_id, action, entity_type, entity_id, request_id, outcome, metadata, created_at
      FROM audit_events
      ORDER BY created_at DESC
      LIMIT $1;
    `;
    const res = await client.query(query, [limit]);
    return res.rows.map((r) => ({
      id: r.id,
      actorId: r.actor_id,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      requestId: r.request_id,
      outcome: r.outcome,
      metadata: r.metadata,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }
}

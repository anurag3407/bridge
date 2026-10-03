import { PoolClient } from 'pg';

export interface OutboxEvent {
  id: string;
  eventType: string;
  entityId: string;
  payload: any;
  createdAt: string;
  processedAt: string | null;
}

export class OutboxRepository {
  async append(
    client: PoolClient,
    eventType: string,
    entityId: string,
    payload: any
  ): Promise<string> {
    const query = `
      INSERT INTO outbox_events (event_type, entity_id, payload)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
    const res = await client.query(query, [eventType, entityId, JSON.stringify(payload)]);
    return res.rows[0].id;
  }

  async fetchUnprocessed(client: PoolClient, limit: number = 20): Promise<OutboxEvent[]> {
    const query = `
      SELECT id, event_type, entity_id, payload, created_at, processed_at
      FROM outbox_events
      WHERE processed_at IS NULL
      ORDER BY created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED;
    `;
    const res = await client.query(query, [limit]);
    return res.rows.map((r) => ({
      id: r.id,
      eventType: r.event_type,
      entityId: r.entity_id,
      payload: r.payload,
      createdAt: new Date(r.created_at).toISOString(),
      processedAt: r.processed_at ? new Date(r.processed_at).toISOString() : null,
    }));
  }

  async markProcessed(client: PoolClient, id: string): Promise<void> {
    await client.query(`UPDATE outbox_events SET processed_at = NOW() WHERE id = $1`, [id]);
  }
}

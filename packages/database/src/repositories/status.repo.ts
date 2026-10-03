import { PoolClient } from 'pg';
import {
  BridgeConditionType,
  BridgePublicStatus,
  BridgeHistoryItem,
} from '@bridge/contracts';
import { calculateFreshness } from '@bridge/domain';

export interface CurrentStatusRow {
  bridgeId: string;
  condition: BridgeConditionType;
  revision: string;
  reportedAt: Date;
  updatedBy: string | null;
}

export interface AppendHistoryInput {
  bridgeId: string;
  oldCondition: BridgeConditionType;
  newCondition: BridgeConditionType;
  oldRevision: string;
  newRevision: string;
  actorId: string;
  privateReason: string;
  publicNote?: string | null;
  requestId: string;
}

export class StatusRepository {
  /**
   * Locks the current status row with FOR UPDATE to prevent lost updates or concurrent races.
   */
  async lockCurrentStatus(client: PoolClient, bridgeId: string): Promise<CurrentStatusRow | null> {
    const query = `
      SELECT bridge_id, condition, revision, reported_at, updated_by
      FROM bridge_current_status
      WHERE bridge_id = $1
      FOR UPDATE;
    `;
    const res = await client.query(query, [bridgeId]);
    if (res.rows.length === 0) return null;

    const r = res.rows[0];
    return {
      bridgeId: r.bridge_id,
      condition: r.condition as BridgeConditionType,
      revision: r.revision.toString(),
      reportedAt: r.reported_at,
      updatedBy: r.updated_by,
    };
  }

  async updateCurrentStatus(
    client: PoolClient,
    bridgeId: string,
    condition: BridgeConditionType,
    newRevision: string,
    actorId: string
  ): Promise<Date> {
    const query = `
      UPDATE bridge_current_status
      SET 
        condition = $2,
        revision = $3,
        reported_at = NOW(),
        updated_by = $4
      WHERE bridge_id = $1
      RETURNING reported_at;
    `;
    const res = await client.query(query, [bridgeId, condition, newRevision, actorId]);
    return res.rows[0].reported_at;
  }

  async appendStatusHistory(client: PoolClient, input: AppendHistoryInput): Promise<string> {
    const query = `
      INSERT INTO bridge_status_history (
        bridge_id, old_condition, new_condition, old_revision, new_revision,
        actor_id, private_reason, public_note, request_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id;
    `;
    const res = await client.query(query, [
      input.bridgeId,
      input.oldCondition,
      input.newCondition,
      input.oldRevision,
      input.newRevision,
      input.actorId,
      input.privateReason,
      input.publicNote || null,
      input.requestId,
    ]);
    return res.rows[0].id;
  }

  async updatePublicProjection(
    client: PoolClient,
    bridgeId: string,
    condition: BridgeConditionType,
    statusRevision: string,
    publicNote?: string | null
  ): Promise<void> {
    const query = `
      UPDATE bridge_public_status
      SET
        condition = $2,
        status_revision = $3,
        public_revision = public_revision + 1,
        reported_at = NOW(),
        public_note = $4,
        updated_at = NOW()
      WHERE bridge_id = $1;
    `;
    await client.query(query, [bridgeId, condition, statusRevision, publicNote || null]);
  }

  async getPublicStatus(client: PoolClient, bridgeId: string): Promise<BridgePublicStatus | null> {
    const query = `
      SELECT 
        bridge_id, condition, status_revision, public_revision, reported_at,
        public_note, is_published
      FROM bridge_public_status
      WHERE bridge_id = $1;
    `;
    const res = await client.query(query, [bridgeId]);
    if (res.rows.length === 0) return null;

    const r = res.rows[0];
    const reportedAtIso = new Date(r.reported_at).toISOString();
    return {
      bridgeId: r.bridge_id,
      condition: r.condition as BridgeConditionType,
      statusRevision: r.status_revision.toString(),
      publicRevision: r.public_revision.toString(),
      reportedAt: reportedAtIso,
      publicNote: r.public_note || null,
      isPublished: r.is_published,
      freshness: calculateFreshness(r.condition, r.reported_at),
      observedAt: new Date().toISOString(),
    };
  }

  async getHistory(
    client: PoolClient,
    bridgeId: string,
    limit: number = 20,
    beforeRevision?: string
  ): Promise<BridgeHistoryItem[]> {
    let query = `
      SELECT 
        h.id, h.bridge_id, h.old_condition, h.new_condition,
        h.old_revision, h.new_revision, h.actor_id, h.private_reason,
        h.public_note, h.request_id, h.created_at,
        p.display_name as actor_display_name
      FROM bridge_status_history h
      LEFT JOIN profiles p ON p.user_id = h.actor_id
      WHERE h.bridge_id = $1
    `;
    const params: any[] = [bridgeId];

    if (beforeRevision) {
      params.push(beforeRevision);
      query += ` AND h.new_revision < $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY h.new_revision DESC LIMIT $${params.length}`;

    const res = await client.query(query, params);
    return res.rows.map((r) => ({
      id: r.id,
      bridgeId: r.bridge_id,
      oldCondition: r.old_condition as BridgeConditionType,
      newCondition: r.new_condition as BridgeConditionType,
      oldRevision: r.old_revision.toString(),
      newRevision: r.new_revision.toString(),
      actorId: r.actor_id,
      actorDisplayName: r.actor_display_name || undefined,
      privateReason: r.private_reason,
      publicNote: r.public_note || null,
      requestId: r.request_id,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }
}

import { PoolClient } from 'pg';

export class AssignmentRepository {
  async isOperatorAssigned(
    client: PoolClient,
    bridgeId: string,
    userId: string
  ): Promise<boolean> {
    const query = `
      SELECT 1 
      FROM bridge_operator_assignments a
      JOIN profiles p ON p.user_id = a.user_id
      WHERE a.bridge_id = $1 
        AND a.user_id = $2 
        AND a.revoked_at IS NULL
        AND p.account_status = 'active';
    `;
    const res = await client.query(query, [bridgeId, userId]);
    return res.rows.length > 0;
  }

  async getAssignedBridgeIds(client: PoolClient, userId: string): Promise<string[]> {
    const query = `
      SELECT bridge_id 
      FROM bridge_operator_assignments
      WHERE user_id = $1 AND revoked_at IS NULL;
    `;
    const res = await client.query(query, [userId]);
    return res.rows.map((r) => r.bridge_id);
  }

  async assignOperator(
    client: PoolClient,
    bridgeId: string,
    userId: string,
    assignedBy: string
  ): Promise<string> {
    const query = `
      INSERT INTO bridge_operator_assignments (bridge_id, user_id, assigned_by)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
    const res = await client.query(query, [bridgeId, userId, assignedBy]);
    return res.rows[0].id;
  }

  async revokeOperator(
    client: PoolClient,
    bridgeId: string,
    userId: string
  ): Promise<boolean> {
    const query = `
      UPDATE bridge_operator_assignments
      SET revoked_at = NOW()
      WHERE bridge_id = $1 AND user_id = $2 AND revoked_at IS NULL;
    `;
    const res = await client.query(query, [bridgeId, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  async listBridgeOperators(
    client: PoolClient,
    bridgeId: string
  ): Promise<Array<{ userId: string; displayName: string; email?: string; assignedAt: string }>> {
    const query = `
      SELECT 
        p.user_id, p.display_name, p.email, a.created_at as assigned_at
      FROM bridge_operator_assignments a
      JOIN profiles p ON p.user_id = a.user_id
      WHERE a.bridge_id = $1 AND a.revoked_at IS NULL;
    `;
    const res = await client.query(query, [bridgeId]);
    return res.rows.map((r) => ({
      userId: r.user_id,
      displayName: r.display_name,
      email: r.email || undefined,
      assignedAt: new Date(r.assigned_at).toISOString(),
    }));
  }
}

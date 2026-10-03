import { PoolClient } from 'pg';
import {
  UserProfile,
  AccountStatusType,
  PlatformRoleType,
} from '@bridge/contracts';
import { DomainError } from '@bridge/domain';

export class ProfileRepository {
  async findById(client: PoolClient, userId: string): Promise<UserProfile | null> {
    const profileRes = await client.query(
      `SELECT user_id, display_name, email, account_status, created_at
       FROM profiles
       WHERE user_id = $1`,
      [userId]
    );

    if (profileRes.rows.length === 0) return null;
    const p = profileRes.rows[0];

    const rolesRes = await client.query(
      `SELECT role FROM platform_roles WHERE user_id = $1`,
      [userId]
    );
    const roles = rolesRes.rows.map((r) => r.role as PlatformRoleType);

    const assignmentsRes = await client.query(
      `SELECT bridge_id FROM bridge_operator_assignments WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    const assignedBridgeIds = assignmentsRes.rows.map((r) => r.bridge_id);

    return {
      id: p.user_id,
      displayName: p.display_name,
      email: p.email || undefined,
      accountStatus: p.account_status as AccountStatusType,
      roles,
      assignedBridgeIds,
      createdAt: new Date(p.created_at).toISOString(),
    };
  }

  async list(client: PoolClient): Promise<UserProfile[]> {
    const profilesRes = await client.query(
      `SELECT user_id, display_name, email, account_status, created_at
       FROM profiles
       ORDER BY created_at ASC`
    );

    const results: UserProfile[] = [];
    for (const p of profilesRes.rows) {
      const rolesRes = await client.query(
        `SELECT role FROM platform_roles WHERE user_id = $1`,
        [p.user_id]
      );
      const roles = rolesRes.rows.map((r) => r.role as PlatformRoleType);

      const assignmentsRes = await client.query(
        `SELECT bridge_id FROM bridge_operator_assignments WHERE user_id = $1 AND revoked_at IS NULL`,
        [p.user_id]
      );
      const assignedBridgeIds = assignmentsRes.rows.map((r) => r.bridge_id);

      results.push({
        id: p.user_id,
        displayName: p.display_name,
        email: p.email || undefined,
        accountStatus: p.account_status as AccountStatusType,
        roles,
        assignedBridgeIds,
        createdAt: new Date(p.created_at).toISOString(),
      });
    }
    return results;
  }

  async upsertProfile(
    client: PoolClient,
    userId: string,
    displayName: string,
    email?: string
  ): Promise<void> {
    await client.query(
      `INSERT INTO profiles (user_id, display_name, email, account_status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (user_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         email = COALESCE(EXCLUDED.email, profiles.email),
         updated_at = NOW()`,
      [userId, displayName, email || null]
    );
  }

  async setAccountStatus(
    client: PoolClient,
    userId: string,
    status: AccountStatusType
  ): Promise<void> {
    if (status === 'disabled') {
      // Last-admin safeguard
      await this.assertNotLastActiveAdmin(client, userId);
    }

    await client.query(
      `UPDATE profiles SET account_status = $1, updated_at = NOW() WHERE user_id = $2`,
      [status, userId]
    );
  }

  async grantSuperAdmin(client: PoolClient, userId: string, grantedBy?: string): Promise<void> {
    await client.query(
      `INSERT INTO platform_roles (user_id, role, granted_by)
       VALUES ($1, 'super_admin', $2)
       ON CONFLICT (user_id, role) DO NOTHING`,
      [userId, grantedBy || null]
    );
  }

  async revokeSuperAdmin(client: PoolClient, userId: string): Promise<void> {
    // Last-admin safeguard: serialize role checks using advisory lock
    await this.assertNotLastActiveAdmin(client, userId);

    await client.query(
      `DELETE FROM platform_roles WHERE user_id = $1 AND role = 'super_admin'`,
      [userId]
    );
  }

  private async assertNotLastActiveAdmin(client: PoolClient, targetUserId: string): Promise<void> {
    const isTargetAdmin = await client.query(
      `SELECT 1 FROM platform_roles WHERE user_id = $1 AND role = 'super_admin'`,
      [targetUserId]
    );

    if (isTargetAdmin.rows.length === 0) return;

    const countRes = await client.query(
      `SELECT count(*) as count
       FROM platform_roles r
       JOIN profiles p ON p.user_id = r.user_id
       WHERE r.role = 'super_admin' AND p.account_status = 'active'`
    );

    const activeAdminCount = parseInt(countRes.rows[0].count, 10);
    if (activeAdminCount <= 1) {
      throw new DomainError('Operation rejected: at least one active super admin must remain');
    }
  }
}

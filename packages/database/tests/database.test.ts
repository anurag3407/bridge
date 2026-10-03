import { describe, it, expect, afterAll } from 'vitest';
import { getPool, closePool, withTransaction, setTransactionActorContext } from '../src';

describe('Database Pool & Transactions', () => {
  afterAll(async () => {
    await closePool();
  });

  it('successfully sets transaction-local actor context without leaking to other transactions', async () => {
    const testUserId = '11111111-2222-3333-4444-555555555555';

    await withTransaction(
      async (client) => {
        const res = await client.query("SELECT current_setting('app.current_user_id', true) as uid");
        expect(res.rows[0].uid).toBe(testUserId);
      },
      { userId: testUserId }
    );

    // Another checkout on the pool must NOT retain the previous transaction context
    const pool = getPool();
    const freshClient = await pool.connect();
    try {
      const res = await freshClient.query("SELECT current_setting('app.current_user_id', true) as uid");
      expect(res.rows[0].uid).toBe('');
    } finally {
      freshClient.release();
    }
  });

  it('rolls back completely when an exception occurs inside withTransaction', async () => {
    const pool = getPool();
    const beforeCountRes = await pool.query('SELECT count(*) as count FROM idempotency_records');
    const beforeCount = parseInt(beforeCountRes.rows[0].count, 10);

    await expect(
      withTransaction(async (client) => {
        await client.query(`
          INSERT INTO idempotency_records (
            actor_id, operation, idempotency_key, request_hash, response_status, response_body, expires_at
          )
          VALUES (
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test-rollback', 'key-123', 'hash', 200, '{}'::jsonb, NOW() + INTERVAL '1 hour'
          )
        `);
        throw new Error('Simulated transaction failure');
      })
    ).rejects.toThrow('Simulated transaction failure');

    const afterCountRes = await pool.query('SELECT count(*) as count FROM idempotency_records');
    const afterCount = parseInt(afterCountRes.rows[0].count, 10);
    expect(afterCount).toBe(beforeCount);
  });
});

import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from '@bridge/observability';
import dotenv from 'dotenv';

dotenv.config();

let poolInstance: Pool | null = null;

export function getPoolConfig(): PoolConfig {
  const connectionString =
    process.env.NODE_ENV === 'test'
      ? process.env.TEST_DATABASE_URL || 'postgresql://postgres@localhost:5432/bridge_test_db'
      : process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/bridge_db';

  return {
    connectionString,
    max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT_MS || '10000', 10),
  };
}

export function getPool(): Pool {
  if (!poolInstance) {
    const config = getPoolConfig();
    poolInstance = new Pool(config);

    poolInstance.on('error', (err) => {
      logger.error('Unexpected idle client error in PostgreSQL pool', { error: err.message });
    });
  }
  return poolInstance;
}

export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

export interface ActorContext {
  userId?: string;
  role?: string;
  requestId?: string;
}

/**
 * Sets transaction-local actor context via parameterized set_config(..., true)
 * is_local = true ensures context never leaks outside this transaction.
 */
export async function setTransactionActorContext(
  client: PoolClient,
  context: ActorContext
): Promise<void> {
  if (context.userId) {
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [context.userId]);
  }
  if (context.role) {
    await client.query("SELECT set_config('app.current_role', $1, true)", [context.role]);
  }
  if (context.requestId) {
    await client.query("SELECT set_config('app.current_request_id', $1, true)", [context.requestId]);
  }
}

/**
 * Executes a callback within a managed transaction.
 * Rolls back on any exception and ensures connection release.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  actorContext?: ActorContext
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    if (actorContext) {
      await setTransactionActorContext(client, actorContext);
    }
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      logger.error('Error during transaction rollback', { error: (rollbackErr as Error).message });
    }
    throw error;
  } finally {
    client.release();
  }
}

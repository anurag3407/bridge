import fs from 'fs';
import path from 'path';
import { getPool, closePool } from './pool';
import { logger } from '@bridge/observability';

export async function runSeed(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const seedFile = path.resolve(__dirname, '../../../supabase/seed.sql');
    if (!fs.existsSync(seedFile)) {
      throw new Error(`Seed file not found at ${seedFile}`);
    }

    const sql = fs.readFileSync(seedFile, 'utf-8');
    logger.info('Applying seed fixtures...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    logger.info('Seed fixtures applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Failed to apply seed fixtures', { error: (err as Error).message });
    throw err;
  } finally {
    client.release();
  }
}

// Direct CLI invocation
if (require.main === module || process.argv[1]?.endsWith('seed.ts')) {
  runSeed()
    .then(() => {
      logger.info('Seed completed successfully.');
      return closePool();
    })
    .catch((err) => {
      logger.error('Seed failed', { error: err.message });
      process.exit(1);
    });
}

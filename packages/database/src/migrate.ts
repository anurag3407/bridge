import fs from 'fs';
import path from 'path';
import { getPool, closePool } from './pool';
import { logger } from '@bridge/observability';

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Create schema_migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Migrations directory
    const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at ${migrationsDir}`);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const alreadyApplied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [file]
      );

      if (alreadyApplied.rowCount && alreadyApplied.rowCount > 0) {
        logger.info(`Migration ${file} already applied, skipping.`);
        continue;
      }

      logger.info(`Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info(`Successfully applied migration: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Failed to apply migration ${file}`, { error: (err as Error).message });
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

// Allow direct CLI invocation
if (require.main === module || process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations()
    .then(() => {
      logger.info('Migrations completed successfully.');
      return closePool();
    })
    .catch((err) => {
      logger.error('Migration failed', { error: err.message });
      process.exit(1);
    });
}

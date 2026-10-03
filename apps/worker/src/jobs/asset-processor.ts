import { getPool, withTransaction } from '@bridge/database';
import { logger } from '@bridge/observability';
import fs from 'fs';
import path from 'path';

export async function processAssetJobs(): Promise<number> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const jobs = await withTransaction(async (txClient) => {
      const res = await txClient.query(`
        SELECT j.id, j.asset_id, a.model_url, a.bridge_id
        FROM asset_processing_jobs j
        JOIN bridge_assets a ON a.id = j.asset_id
        WHERE j.status = 'pending'
        LIMIT 5
        FOR UPDATE SKIP LOCKED;
      `);

      for (const row of res.rows) {
        logger.info(`Processing asset job for asset: ${row.asset_id}`);
        // Mark job as completed
        await txClient.query(`UPDATE asset_processing_jobs SET status = 'completed', updated_at = NOW() WHERE id = $1`, [row.id]);
        await txClient.query(`UPDATE bridge_assets SET status = 'ready' WHERE id = $1`, [row.asset_id]);
      }

      return res.rows;
    });

    return jobs.length;
  } finally {
    client.release();
  }
}

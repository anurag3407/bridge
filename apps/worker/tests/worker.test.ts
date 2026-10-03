import { describe, it, expect } from 'vitest';
import { processOutboxBatch } from '../src/jobs/outbox';
import { processAssetJobs } from '../src/jobs/asset-processor';

describe('Background Worker Jobs', () => {
  it('executes processOutboxBatch without error', async () => {
    const processedCount = await processOutboxBatch(null);
    expect(typeof processedCount).toBe('number');
  });

  it('executes processAssetJobs without error', async () => {
    const jobsCount = await processAssetJobs();
    expect(typeof jobsCount).toBe('number');
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import { FastifyInstance } from 'fastify';
import { getPool, closePool, runMigrations, runSeed } from '@bridge/database';
import { TEST_FIXTURES, generateTestToken } from '@bridge/test-utils';

describe('Bridge Operations API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Run migrations and seed data on test database
    await runMigrations();
    await runSeed();

    const pool = getPool();
    await pool.query("UPDATE bridge_current_status SET condition = 'UNKNOWN', revision = 0 WHERE bridge_id = $1", [TEST_FIXTURES.bridges.bridgeA.id]);
    await pool.query("DELETE FROM bridge_status_history WHERE bridge_id = $1", [TEST_FIXTURES.bridges.bridgeA.id]);
    await pool.query("DELETE FROM idempotency_records");

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    await closePool();
  });

  describe('Health Checks', () => {
    it('GET /health/live returns live status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/live',
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('live');
    });

    it('GET /health/ready returns ready and database status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ready');
      expect(body.database).toBe('connected');
    });
  });

  describe('Public Bridge Endpoints', () => {
    it('GET /api/v1/bridges returns only published bridges', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/bridges',
      });
      expect(response.statusCode).toBe(200);
      const bridges = JSON.parse(response.body);

      expect(Array.isArray(bridges)).toBe(true);
      expect(bridges.length).toBeGreaterThanOrEqual(2);

      // Verify draft and retired bridges are excluded
      const slugs = bridges.map((b: any) => b.slug);
      expect(slugs).toContain('river-gorge-bridge');
      expect(slugs).toContain('coastal-causeway');
      expect(slugs).not.toContain('mountain-pass-bridge'); // draft
      expect(slugs).not.toContain('old-timber-crossing'); // retired

      // Verify no sensitive columns leak
      for (const b of bridges) {
        expect(b).not.toHaveProperty('actor_id');
        expect(b).not.toHaveProperty('private_reason');
      }
    });

    it('GET /api/v1/bridges/:slug returns bridge detail with 3D asset config', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/bridges/river-gorge-bridge',
      });
      expect(response.statusCode).toBe(200);
      const bridge = JSON.parse(response.body);

      expect(bridge.slug).toBe('river-gorge-bridge');
      expect(bridge.displayName).toBe('River Gorge Suspension Bridge');
      expect(bridge.asset).toBeDefined();
      expect(bridge.asset.modelUrl).toBe('/models/bridge.glb');
      expect(bridge.asset.viewerConfig.warningAnchor).toEqual([8.54, 17.5, 63.09]);
    });

    it('GET /api/v1/bridges/:bridgeId/status returns small authoritative snapshot', async () => {
      const bridgeId = TEST_FIXTURES.bridges.bridgeA.id;
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/bridges/${bridgeId}/status`,
      });
      expect(response.statusCode).toBe(200);
      const status = JSON.parse(response.body);
      expect(status.bridgeId).toBe(bridgeId);
      expect(status.condition).toBeDefined();
      expect(status.statusRevision).toBeDefined();
      expect(status.isPublished).toBe(true);
    });
  });

  describe('Authentication & Authorization Guards', () => {
    it('GET /api/v1/me rejects unauthenticated request with 401', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
      });
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/v1/me rejects disabled accounts with 403', async () => {
      const token = generateTestToken(TEST_FIXTURES.disabled.id, TEST_FIXTURES.disabled.email);
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('GET /api/v1/me resolves active user profile', async () => {
      const token = generateTestToken(TEST_FIXTURES.operatorA.id, TEST_FIXTURES.operatorA.email);
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(200);
      const profile = JSON.parse(response.body);
      expect(profile.id).toBe(TEST_FIXTURES.operatorA.id);
      expect(profile.displayName).toBe('Operator Alice (Gorge Sector)');
    });
  });

  describe('Atomic Condition Reporting & Concurrency', () => {
    const bridgeId = TEST_FIXTURES.bridges.bridgeA.id;
    const operatorAToken = generateTestToken(TEST_FIXTURES.operatorA.id, TEST_FIXTURES.operatorA.email);
    const operatorBToken = generateTestToken(TEST_FIXTURES.operatorB.id, TEST_FIXTURES.operatorB.email);

    it('Operator Alice cannot report condition on unassigned Bridge B (IDOR protection)', async () => {
      const unassignedBridgeId = TEST_FIXTURES.bridges.bridgeB.id;
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/bridges/${unassignedBridgeId}/reports`,
        headers: { Authorization: `Bearer ${operatorAToken}` },
        payload: {
          condition: 'NORMAL',
          reason: 'Unauthorized attempt',
          expectedRevision: '0',
        },
      });
      expect(response.statusCode).toBe(403);
    });

    it('rejects BROKEN report missing observation reason (422)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/bridges/${bridgeId}/reports`,
        headers: { Authorization: `Bearer ${operatorAToken}` },
        payload: {
          condition: 'BROKEN',
          reason: '',
          expectedRevision: '0',
        },
      });
      expect(response.statusCode).toBe(422);
    });

    it('successfully commits BROKEN report atomically and increments revision to 1', async () => {
      const idempotencyKey = `test-report-${Date.now()}`;
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/bridges/${bridgeId}/reports`,
        headers: {
          Authorization: `Bearer ${operatorAToken}`,
          'Idempotency-Key': idempotencyKey,
        },
        payload: {
          condition: 'BROKEN',
          reason: 'Severe surface pothole detected on northern approach deck',
          publicNote: 'Traffic reduced to single lane due to deck damage inspection.',
          expectedRevision: '0',
        },
      });

      expect(response.statusCode).toBe(200);
      const snapshot = JSON.parse(response.body);
      expect(snapshot.condition).toBe('BROKEN');
      expect(snapshot.statusRevision).toBe('1');
      expect(snapshot.publicNote).toBe('Traffic reduced to single lane due to deck damage inspection.');

      // Verify idempotency replay returns the exact same snapshot
      const replayResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/bridges/${bridgeId}/reports`,
        headers: {
          Authorization: `Bearer ${operatorAToken}`,
          'Idempotency-Key': idempotencyKey,
        },
        payload: {
          condition: 'BROKEN',
          reason: 'Severe surface pothole detected on northern approach deck',
          publicNote: 'Traffic reduced to single lane due to deck damage inspection.',
          expectedRevision: '0',
        },
      });
      expect(replayResponse.statusCode).toBe(200);
      expect(JSON.parse(replayResponse.body).statusRevision).toBe('1');
    });

    it('rejects stale revision report with 409 Conflict', async () => {
      // Server revision is now 1, submitting expectedRevision '0' must fail with 409
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/bridges/${bridgeId}/reports`,
        headers: { Authorization: `Bearer ${operatorAToken}` },
        payload: {
          condition: 'NORMAL',
          reason: 'Stale attempt',
          expectedRevision: '0',
        },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('CONFLICT');
    });

    it('resolves condition back to NORMAL with resolution explanation (revision -> 2)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/bridges/${bridgeId}/reports`,
        headers: { Authorization: `Bearer ${operatorAToken}` },
        payload: {
          condition: 'NORMAL',
          reason: 'Road repair team completed asphalt patch and compaction',
          publicNote: null,
          expectedRevision: '1',
        },
      });

      expect(response.statusCode).toBe(200);
      const snapshot = JSON.parse(response.body);
      expect(snapshot.condition).toBe('NORMAL');
      expect(snapshot.statusRevision).toBe('2');
    });

    it('GET /api/v1/bridges/:bridgeId/history verifies immutable audit records', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/bridges/${bridgeId}/history`,
        headers: { Authorization: `Bearer ${operatorAToken}` },
      });
      expect(response.statusCode).toBe(200);
      const history = JSON.parse(response.body);
      expect(history.length).toBeGreaterThanOrEqual(2);

      expect(history[0].newRevision).toBe('2');
      expect(history[0].newCondition).toBe('NORMAL');
      expect(history[1].newRevision).toBe('1');
      expect(history[1].newCondition).toBe('BROKEN');
    });
  });

  describe('Super Admin Operations', () => {
    const adminToken = generateTestToken(TEST_FIXTURES.admin.id, TEST_FIXTURES.admin.email);

    it('Super admin can create a new bridge', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/bridges',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          slug: `test-viaduct-${Date.now()}`,
          displayName: 'Test High Viaduct',
          description: 'Created during automated integration test',
          locationLabel: 'Interstate Mile 55',
        },
      });
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
    });

    it('Super admin can search security audit trail', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/audit',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(response.statusCode).toBe(200);
      const logs = JSON.parse(response.body);
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
    });
  });
});

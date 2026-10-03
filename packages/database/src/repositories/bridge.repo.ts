import { PoolClient } from 'pg';
import {
  BridgeSummary,
  BridgeDetail,
  CreateBridgeRequest,
  UpdateBridgeRequest,
  ViewerConfig,
  AssetManifest,
  BridgeConditionType,
} from '@bridge/contracts';
import { calculateFreshness as getFreshness } from '@bridge/domain';

export class BridgeRepository {
  async listPublished(client: PoolClient): Promise<BridgeSummary[]> {
    const query = `
      SELECT 
        b.id,
        b.slug,
        b.display_name,
        b.description,
        b.lifecycle,
        b.location_label,
        b.latitude,
        b.longitude,
        s.condition as current_condition,
        s.reported_at,
        vc.fallback_poster_url as thumbnail_url
      FROM bridges b
      JOIN bridge_current_status s ON s.bridge_id = b.id
      LEFT JOIN bridge_viewer_configs vc ON vc.bridge_id = b.id
      WHERE b.lifecycle = 'published'
      ORDER BY b.display_name ASC;
    `;
    const res = await client.query(query);

    return res.rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      displayName: r.display_name,
      description: r.description,
      lifecycle: r.lifecycle,
      locationLabel: r.location_label,
      latitude: r.latitude,
      longitude: r.longitude,
      currentCondition: r.current_condition as BridgeConditionType,
      reportedAt: r.reported_at ? new Date(r.reported_at).toISOString() : null,
      freshness: getFreshness(r.current_condition, r.reported_at),
      thumbnailUrl: r.thumbnail_url || null,
    }));
  }

  async listAll(client: PoolClient): Promise<BridgeSummary[]> {
    const query = `
      SELECT 
        b.id,
        b.slug,
        b.display_name,
        b.description,
        b.lifecycle,
        b.location_label,
        b.latitude,
        b.longitude,
        s.condition as current_condition,
        s.reported_at,
        vc.fallback_poster_url as thumbnail_url
      FROM bridges b
      LEFT JOIN bridge_current_status s ON s.bridge_id = b.id
      LEFT JOIN bridge_viewer_configs vc ON vc.bridge_id = b.id
      ORDER BY b.created_at DESC;
    `;
    const res = await client.query(query);

    return res.rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      displayName: r.display_name,
      description: r.description,
      lifecycle: r.lifecycle,
      locationLabel: r.location_label,
      latitude: r.latitude,
      longitude: r.longitude,
      currentCondition: (r.current_condition || 'UNKNOWN') as BridgeConditionType,
      reportedAt: r.reported_at ? new Date(r.reported_at).toISOString() : null,
      freshness: getFreshness(r.current_condition || 'UNKNOWN', r.reported_at),
      thumbnailUrl: r.thumbnail_url || null,
    }));
  }

  async findBySlug(client: PoolClient, slug: string): Promise<BridgeDetail | null> {
    const query = `
      SELECT 
        b.id,
        b.slug,
        b.display_name,
        b.description,
        b.lifecycle,
        b.location_label,
        b.latitude,
        b.longitude,
        s.condition as current_condition,
        s.revision as status_revision,
        s.reported_at,
        ps.public_revision,
        ps.public_note,
        vc.id as vc_id,
        vc.config_version,
        vc.transform,
        vc.bounds,
        vc.camera,
        vc.warning_anchor,
        vc.selected_road_nodes,
        vc.fallback_poster_url,
        a.id as asset_id,
        a.version as asset_version,
        a.status as asset_status,
        a.model_url,
        a.sha256 as asset_sha256,
        a.byte_count,
        a.optimization_method
      FROM bridges b
      LEFT JOIN bridge_current_status s ON s.bridge_id = b.id
      LEFT JOIN bridge_public_status ps ON ps.bridge_id = b.id
      LEFT JOIN bridge_assets a ON a.bridge_id = b.id AND a.status = 'ready'
      LEFT JOIN bridge_viewer_configs vc ON vc.bridge_id = b.id AND vc.asset_id = a.id
      WHERE b.slug = $1;
    `;
    const res = await client.query(query, [slug]);
    if (res.rows.length === 0) return null;

    const r = res.rows[0];
    let asset: AssetManifest | null = null;

    if (r.asset_id && r.vc_id) {
      const viewerConfig: ViewerConfig = {
        assetId: r.asset_id,
        configVersion: r.config_version,
        modelToViewerTransform: r.transform,
        measuredBounds: r.bounds,
        camera: r.camera,
        warningAnchor: r.warning_anchor,
        selectedRoadNodePaths: r.selected_road_nodes || undefined,
        fallbackPosterUrl: r.fallback_poster_url,
      };

      asset = {
        id: r.asset_id,
        bridgeId: r.id,
        version: r.asset_version,
        status: r.asset_status,
        modelUrl: r.model_url,
        sha256: r.asset_sha256,
        byteCount: Number(r.byte_count),
        viewerConfig,
        optimizationMethod: r.optimization_method || 'baseline',
      };
    }

    return {
      id: r.id,
      slug: r.slug,
      displayName: r.display_name,
      description: r.description,
      lifecycle: r.lifecycle,
      locationLabel: r.location_label,
      latitude: r.latitude,
      longitude: r.longitude,
      currentCondition: (r.current_condition || 'UNKNOWN') as BridgeConditionType,
      reportedAt: r.reported_at ? new Date(r.reported_at).toISOString() : null,
      freshness: getFreshness(r.current_condition || 'UNKNOWN', r.reported_at),
      thumbnailUrl: r.fallback_poster_url || null,
      asset,
      publicNote: r.public_note || null,
      statusRevision: (r.status_revision ?? '0').toString(),
      publicRevision: (r.public_revision ?? '0').toString(),
    };
  }

  async findById(client: PoolClient, id: string): Promise<BridgeDetail | null> {
    const res = await client.query('SELECT slug FROM bridges WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.findBySlug(client, res.rows[0].slug);
  }

  async create(client: PoolClient, data: CreateBridgeRequest): Promise<string> {
    const query = `
      INSERT INTO bridges (
        slug, display_name, description, location_label, latitude, longitude, lifecycle
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'draft')
      RETURNING id;
    `;
    const res = await client.query(query, [
      data.slug,
      data.displayName,
      data.description || null,
      data.locationLabel || null,
      data.latitude ?? null,
      data.longitude ?? null,
    ]);

    const bridgeId = res.rows[0].id;

    // Initialize canonical status as UNKNOWN with revision 0
    await client.query(
      `INSERT INTO bridge_current_status (bridge_id, condition, revision, reported_at)
       VALUES ($1, 'UNKNOWN', 0, NOW())`,
      [bridgeId]
    );

    // Initialize public status projection as not published
    await client.query(
      `INSERT INTO bridge_public_status (bridge_id, condition, status_revision, public_revision, reported_at, is_published)
       VALUES ($1, 'UNKNOWN', 0, 0, NOW(), FALSE)`,
      [bridgeId]
    );

    return bridgeId;
  }

  async update(client: PoolClient, id: string, data: UpdateBridgeRequest): Promise<void> {
    const sets: string[] = ['updated_at = NOW()'];
    const values: any[] = [id];
    let idx = 2;

    if (data.displayName !== undefined) {
      sets.push(`display_name = $${idx++}`);
      values.push(data.displayName);
    }
    if (data.description !== undefined) {
      sets.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.locationLabel !== undefined) {
      sets.push(`location_label = $${idx++}`);
      values.push(data.locationLabel);
    }
    if (data.latitude !== undefined) {
      sets.push(`latitude = $${idx++}`);
      values.push(data.latitude);
    }
    if (data.longitude !== undefined) {
      sets.push(`longitude = $${idx++}`);
      values.push(data.longitude);
    }
    if (data.lifecycle !== undefined) {
      sets.push(`lifecycle = $${idx++}`);
      values.push(data.lifecycle);

      // If lifecycle changes to published / draft / retired, update public projection atomically
      const isPublished = data.lifecycle === 'published';
      await client.query(
        `UPDATE bridge_public_status 
         SET is_published = $1, public_revision = public_revision + 1, updated_at = NOW()
         WHERE bridge_id = $2`,
        [isPublished, id]
      );
    }

    const query = `UPDATE bridges SET ${sets.join(', ')} WHERE id = $1`;
    await client.query(query, values);
  }
}

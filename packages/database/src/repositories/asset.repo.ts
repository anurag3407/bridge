import { PoolClient } from 'pg';
import {
  AssetManifest,
  ViewerConfig,
  AssetProcessingStateType,
} from '@bridge/contracts';

export class AssetRepository {
  async getActiveAssetForBridge(
    client: PoolClient,
    bridgeId: string
  ): Promise<AssetManifest | null> {
    const query = `
      SELECT 
        a.id as asset_id, a.bridge_id, a.version, a.status, a.model_url, a.sha256, a.byte_count, a.optimization_method,
        vc.config_version, vc.transform, vc.bounds, vc.camera, vc.warning_anchor, vc.selected_road_nodes, vc.fallback_poster_url
      FROM bridge_assets a
      JOIN bridge_viewer_configs vc ON vc.asset_id = a.id
      WHERE a.bridge_id = $1 AND a.status = 'ready'
      ORDER BY a.version DESC
      LIMIT 1;
    `;
    const res = await client.query(query, [bridgeId]);
    if (res.rows.length === 0) return null;

    const r = res.rows[0];
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

    return {
      id: r.asset_id,
      bridgeId: r.bridge_id,
      version: r.version,
      status: r.status as AssetProcessingStateType,
      modelUrl: r.model_url,
      sha256: r.sha256,
      byteCount: Number(r.byte_count),
      viewerConfig,
      optimizationMethod: r.optimization_method,
    };
  }

  async createAsset(
    client: PoolClient,
    bridgeId: string,
    modelUrl: string,
    sha256: string,
    byteCount: number,
    uploadedBy: string,
    optimizationMethod: string = 'baseline'
  ): Promise<string> {
    const nextVerRes = await client.query(
      `SELECT COALESCE(MAX(version), 0) + 1 as next_ver FROM bridge_assets WHERE bridge_id = $1`,
      [bridgeId]
    );
    const nextVersion = nextVerRes.rows[0].next_ver;

    const query = `
      INSERT INTO bridge_assets (
        bridge_id, version, status, model_url, sha256, byte_count, optimization_method, uploaded_by
      )
      VALUES ($1, $2, 'ready', $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const res = await client.query(query, [
      bridgeId,
      nextVersion,
      modelUrl,
      sha256,
      byteCount,
      optimizationMethod,
      uploadedBy,
    ]);
    return res.rows[0].id;
  }

  async saveViewerConfig(
    client: PoolClient,
    bridgeId: string,
    assetId: string,
    config: ViewerConfig
  ): Promise<string> {
    const query = `
      INSERT INTO bridge_viewer_configs (
        bridge_id, asset_id, config_version, transform, bounds, camera, warning_anchor, selected_road_nodes, fallback_poster_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id;
    `;
    const res = await client.query(query, [
      bridgeId,
      assetId,
      config.configVersion,
      JSON.stringify(config.modelToViewerTransform),
      JSON.stringify(config.measuredBounds),
      JSON.stringify(config.camera),
      JSON.stringify(config.warningAnchor),
      JSON.stringify(config.selectedRoadNodePaths || []),
      config.fallbackPosterUrl,
    ]);
    return res.rows[0].id;
  }
}

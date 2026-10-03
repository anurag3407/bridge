-- 00001_initial_schema.sql
-- Core PostgreSQL schema for Bridge Operations Platform

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Platform roles table
CREATE TABLE IF NOT EXISTS platform_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin')),
  granted_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_role UNIQUE (user_id, role)
);

-- Bridges table
CREATE TABLE IF NOT EXISTS bridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  lifecycle TEXT NOT NULL DEFAULT 'draft' CHECK (lifecycle IN ('draft', 'published', 'retired')),
  lifecycle_revision BIGINT NOT NULL DEFAULT 0,
  location_label TEXT,
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_coordinates_both_or_neither CHECK (
    (latitude IS NULL AND longitude IS NULL) OR 
    (latitude IS NOT NULL AND longitude IS NOT NULL)
  )
);

-- Operator bridge assignments
CREATE TABLE IF NOT EXISTS bridge_operator_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bridge_id UUID NOT NULL REFERENCES bridges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_assignment 
ON bridge_operator_assignments(bridge_id, user_id) 
WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_user ON bridge_operator_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_bridge ON bridge_operator_assignments(bridge_id);

-- Current canonical condition (1:1 with bridges)
CREATE TABLE IF NOT EXISTS bridge_current_status (
  bridge_id UUID PRIMARY KEY REFERENCES bridges(id) ON DELETE CASCADE,
  condition TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (condition IN ('UNKNOWN', 'NORMAL', 'BROKEN', 'DANGER')),
  revision BIGINT NOT NULL DEFAULT 0,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(user_id)
);

-- Immutable audit history of condition reports
CREATE TABLE IF NOT EXISTS bridge_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bridge_id UUID NOT NULL REFERENCES bridges(id) ON DELETE CASCADE,
  old_condition TEXT NOT NULL CHECK (old_condition IN ('UNKNOWN', 'NORMAL', 'BROKEN', 'DANGER')),
  new_condition TEXT NOT NULL CHECK (new_condition IN ('UNKNOWN', 'NORMAL', 'BROKEN', 'DANGER')),
  old_revision BIGINT NOT NULL,
  new_revision BIGINT NOT NULL,
  actor_id UUID NOT NULL REFERENCES profiles(user_id),
  private_reason TEXT NOT NULL,
  public_note TEXT,
  request_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_bridge_new_revision UNIQUE (bridge_id, new_revision)
);

CREATE INDEX IF NOT EXISTS idx_history_bridge_rev ON bridge_status_history(bridge_id, new_revision DESC);

-- Public sanitized projection for real-time and public endpoints
CREATE TABLE IF NOT EXISTS bridge_public_status (
  bridge_id UUID PRIMARY KEY REFERENCES bridges(id) ON DELETE CASCADE,
  condition TEXT NOT NULL CHECK (condition IN ('UNKNOWN', 'NORMAL', 'BROKEN', 'DANGER')),
  status_revision BIGINT NOT NULL DEFAULT 0,
  public_revision BIGINT NOT NULL DEFAULT 0,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  public_note TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bridge assets table (3D models)
CREATE TABLE IF NOT EXISTS bridge_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bridge_id UUID NOT NULL REFERENCES bridges(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('awaiting_upload', 'uploaded', 'validating', 'processing', 'ready', 'failed')),
  model_url TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  byte_count BIGINT NOT NULL DEFAULT 0,
  optimization_method TEXT NOT NULL DEFAULT 'baseline',
  uploaded_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_bridge_asset_version UNIQUE (bridge_id, version)
);

-- Viewer configuration table
CREATE TABLE IF NOT EXISTS bridge_viewer_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bridge_id UUID NOT NULL REFERENCES bridges(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES bridge_assets(id) ON DELETE CASCADE,
  config_version INT NOT NULL DEFAULT 1,
  transform JSONB NOT NULL,
  bounds JSONB NOT NULL,
  camera JSONB NOT NULL,
  warning_anchor JSONB NOT NULL,
  selected_road_nodes JSONB,
  fallback_poster_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit events table
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(user_id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id);

-- Idempotency records table
CREATE TABLE IF NOT EXISTS idempotency_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES profiles(user_id),
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INT NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_actor_op_key UNIQUE (actor_id, operation, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_records(expires_at);

-- Outbox events table
CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed ON outbox_events(created_at) WHERE processed_at IS NULL;

-- Asset processing background jobs table
CREATE TABLE IF NOT EXISTS asset_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES bridge_assets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  lease_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

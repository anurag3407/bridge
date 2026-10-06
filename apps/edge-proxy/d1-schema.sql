CREATE TABLE IF NOT EXISTS bridges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  location_lat REAL,
  location_lng REAL,
  lifecycle TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bridge_statuses (
  id TEXT PRIMARY KEY,
  bridge_id TEXT NOT NULL UNIQUE REFERENCES bridges(id),
  revision INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'NORMAL',
  reported_at TEXT NOT NULL,
  active_warning INTEGER NOT NULL DEFAULT 0,
  marker_position TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bridge_status_reports (
  id TEXT PRIMARY KEY,
  bridge_id TEXT NOT NULL REFERENCES bridges(id),
  reporter_id TEXT NOT NULL,
  expected_revision INTEGER NOT NULL,
  condition TEXT NOT NULL,
  reason TEXT,
  reported_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bridge_assets (
  id TEXT PRIMARY KEY,
  bridge_id TEXT NOT NULL REFERENCES bridges(id),
  version TEXT NOT NULL,
  url TEXT NOT NULL,
  anchor_roadway_node_name TEXT NOT NULL,
  anchor_warning_position TEXT NOT NULL,
  default_camera_position TEXT NOT NULL,
  target_center TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  display_name TEXT NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS operator_assignments (
  bridge_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  PRIMARY KEY (bridge_id, user_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL
);

-- Seed Bridges
INSERT OR REPLACE INTO bridges (id, name, slug, description, location_lat, location_lng, lifecycle, created_at, updated_at) VALUES
('b1000000-0000-0000-0000-000000000001', 'River Gorge Suspension Bridge', 'river-gorge-bridge', 'Critical arterial suspension bridge crossing the central river gorge. Features high-elevation main span and real-time roadway sensor monitoring.', 37.7749, -122.4194, 'published', '2026-10-03T00:00:00.000Z', '2026-10-03T00:00:00.000Z'),
('b2000000-0000-0000-0000-000000000002', 'Bay Crossing Cable Bridge', 'bay-crossing-bridge', 'High-capacity dual-deck cable-stayed bridge spanning maritime shipping channels.', 37.8199, -122.4783, 'published', '2026-10-03T00:00:00.000Z', '2026-10-03T00:00:00.000Z'),
('b3000000-0000-0000-0000-000000000003', 'Harbor Viaduct', 'harbor-viaduct', 'Multi-span concrete urban connector viaduct linking industrial port terminals.', 37.8080, -122.4177, 'published', '2026-10-03T00:00:00.000Z', '2026-10-03T00:00:00.000Z');

-- Seed Statuses
INSERT OR REPLACE INTO bridge_statuses (id, bridge_id, revision, condition, reported_at, active_warning, marker_position) VALUES
('s1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 0, 'NORMAL', '2026-10-03T14:00:00.000Z', 0, '[8.54, 17.5, 63.09]'),
('s2000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 0, 'NORMAL', '2026-10-03T14:00:00.000Z', 0, '[0, 10, 0]'),
('s3000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000003', 0, 'NORMAL', '2026-10-03T14:00:00.000Z', 0, '[0, 5, 0]');

-- Seed 3D Assets
INSERT OR REPLACE INTO bridge_assets (id, bridge_id, version, url, anchor_roadway_node_name, anchor_warning_position, default_camera_position, target_center, byte_size, is_active) VALUES
('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '1.0.0', '/models/bridge.glb', 'Bridge_Road_Deck', '[0.0, 9.2, 18.0]', '[48, 28, 65]', '[0, 5, 11]', 15125480, 1);

-- Seed User Profiles
-- password_hash for 'operator123' and 'admin123'
INSERT OR REPLACE INTO user_profiles (id, email, password_hash, role, display_name, disabled) VALUES
('u1000000-0000-0000-0000-000000000001', 'alice@bridge.gov', 'c38a2e1d6d841b53:2bf510e1a1795c6c97a7a3b379e52e5eeeb614a905e3f46f33d712f5a092ee0f', 'operator', 'Alice Operator', 0),
('u2000000-0000-0000-0000-000000000002', 'admin@bridge.gov', 'c38a2e1d6d841b53:2bf510e1a1795c6c97a7a3b379e52e5eeeb614a905e3f46f33d712f5a092ee0f', 'admin', 'Bob Administrator', 0);

-- Seed Assignments
INSERT OR REPLACE INTO operator_assignments (bridge_id, user_id, assigned_at) VALUES
('b1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000001', '2026-10-03T00:00:00.000Z');

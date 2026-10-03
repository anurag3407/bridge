-- supabase/seed.sql
-- Deterministic seed fixtures for testing and development

-- 1. Profiles
INSERT INTO profiles (user_id, display_name, email, account_status)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chief Infrastructure Admin', 'admin@bridge.local', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Operator Alice (Gorge Sector)', 'operator-a@bridge.local', 'active'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Operator Bob (Coastal Sector)', 'operator-b@bridge.local', 'active'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Unassigned Staff', 'unassigned@bridge.local', 'active'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Disabled Operator', 'disabled@bridge.local', 'disabled')
ON CONFLICT (user_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  account_status = EXCLUDED.account_status;

-- 2. Platform Roles
INSERT INTO platform_roles (id, user_id, role)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Bridges
INSERT INTO bridges (id, slug, display_name, description, lifecycle, lifecycle_revision, location_label, latitude, longitude)
VALUES 
  (
    '11111111-1111-1111-1111-111111111111',
    'river-gorge-bridge',
    'River Gorge Suspension Bridge',
    'Historic twin-span suspension bridge spanning the gorge with dual carriageway and pedestrian walkways.',
    'published',
    1,
    'Mile 42, Gorge Highway',
    45.5898,
    -121.9945
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'coastal-causeway',
    'Coastal Marine Causeway',
    'Pre-stressed concrete box girder crossing the coastal bay with heavy freight lanes.',
    'published',
    1,
    'Bay Highway Coastal Reach',
    37.8200,
    -122.3700
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'mountain-pass-bridge',
    'Alpine Mountain Pass Viaduct',
    'High altitude viaduct under active seismic retrofitting (draft stage).',
    'draft',
    0,
    'Highway 9 Mountain Mile',
    46.2000,
    -122.1800
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'old-timber-crossing',
    'Old Timber Crossing',
    'Decommissioned historical timber trestle bridge.',
    'retired',
    2,
    'County Route 12',
    44.9000,
    -123.1000
  )
ON CONFLICT (slug) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  lifecycle = EXCLUDED.lifecycle;

-- 4. Active Operator Assignments
INSERT INTO bridge_operator_assignments (id, bridge_id, user_id, assigned_by)
VALUES 
  (
    'b1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  )
ON CONFLICT DO NOTHING;

-- 5. Canonical Current Status (All start UNKNOWN, never NORMAL)
INSERT INTO bridge_current_status (bridge_id, condition, revision, reported_at, updated_by)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'UNKNOWN', 0, NOW(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'UNKNOWN', 0, NOW(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('33333333-3333-3333-3333-333333333333', 'UNKNOWN', 0, NOW(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('44444444-4444-4444-4444-444444444444', 'UNKNOWN', 0, NOW(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (bridge_id) DO NOTHING;

-- 6. Public Status Projection
INSERT INTO bridge_public_status (bridge_id, condition, status_revision, public_revision, reported_at, public_note, is_published)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'UNKNOWN', 0, 0, NOW(), NULL, TRUE),
  ('22222222-2222-2222-2222-222222222222', 'UNKNOWN', 0, 0, NOW(), NULL, TRUE),
  ('33333333-3333-3333-3333-333333333333', 'UNKNOWN', 0, 0, NOW(), NULL, FALSE),
  ('44444444-4444-4444-4444-444444444444', 'UNKNOWN', 0, 0, NOW(), NULL, FALSE)
ON CONFLICT (bridge_id) DO UPDATE SET 
  condition = EXCLUDED.condition,
  is_published = EXCLUDED.is_published;

-- 7. Bridge Asset & Viewer Config for river-gorge-bridge
INSERT INTO bridge_assets (
  id,
  bridge_id,
  version,
  status,
  model_url,
  sha256,
  byte_count,
  optimization_method,
  uploaded_by
)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  '11111111-1111-1111-1111-111111111111',
  1,
  'ready',
  '/models/bridge.glb',
  'bc916f3f03d9080ed19af5c20e10aa5e11c69d73aad2cd53d4cd71702dce409d',
  2878408,
  'baseline',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
)
ON CONFLICT (bridge_id, version) DO NOTHING;

INSERT INTO bridge_viewer_configs (
  id,
  bridge_id,
  asset_id,
  config_version,
  transform,
  bounds,
  camera,
  warning_anchor,
  selected_road_nodes,
  fallback_poster_url
)
VALUES (
  '88888888-8888-8888-8888-888888888888',
  '11111111-1111-1111-1111-111111111111',
  '99999999-9999-9999-9999-999999999999',
  1,
  '{"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}'::jsonb,
  '{"min": [-108.91, -131.23, -416.87], "max": [153.56, 57.44, 308.20], "center": [22.32, -36.89, -54.33], "size": [262.47, 188.68, 725.07]}'::jsonb,
  '{"minDistance": 10, "maxDistance": 1500, "defaultPosition": [120, 100, 220], "target": [22.32, 10, -54.33]}'::jsonb,
  '[8.54, 17.5, 63.09]'::jsonb,
  '["Roads 1 Roads 1 [344015]"]'::jsonb,
  '/models/bridge_poster.webp'
)
ON CONFLICT DO NOTHING;

-- 00002_rls_and_functions.sql
-- Transaction-local actor helpers and Row Level Security (RLS) policies

-- Helper function to retrieve current user ID from transaction config
CREATE OR REPLACE FUNCTION app_user_id() RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to check if current user is an active super admin
CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := app_user_id();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM platform_roles r
    JOIN profiles p ON p.user_id = r.user_id
    WHERE r.user_id = v_user_id 
      AND r.role = 'super_admin'
      AND p.account_status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to check if current user is an active assigned operator for a given bridge
CREATE OR REPLACE FUNCTION is_assigned_operator(p_bridge_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := app_user_id();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM bridge_operator_assignments a
    JOIN profiles p ON p.user_id = a.user_id
    WHERE a.bridge_id = p_bridge_id 
      AND a.user_id = v_user_id
      AND a.revoked_at IS NULL
      AND p.account_status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS on sensitive tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridges ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_operator_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_current_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_public_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_viewer_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_records ENABLE ROW LEVEL SECURITY;

-- 1. bridge_public_status: Public read allowed ONLY for published bridges
CREATE POLICY p_bridge_public_status_select ON bridge_public_status
  FOR SELECT USING (is_published = true OR is_super_admin());

-- 2. bridges: Public read allowed if published; operators read assigned; admin reads all
CREATE POLICY p_bridges_select ON bridges
  FOR SELECT USING (
    lifecycle = 'published' 
    OR is_super_admin() 
    OR is_assigned_operator(id)
  );

CREATE POLICY p_bridges_admin_write ON bridges
  FOR ALL USING (is_super_admin());

-- 3. bridge_operator_assignments: Admin reads/writes; operators read own
CREATE POLICY p_assignments_select ON bridge_operator_assignments
  FOR SELECT USING (
    user_id = app_user_id() 
    OR is_super_admin()
  );

CREATE POLICY p_assignments_admin_write ON bridge_operator_assignments
  FOR ALL USING (is_super_admin());

-- 4. bridge_current_status: Read by public (if published), operator or admin
CREATE POLICY p_current_status_select ON bridge_current_status
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM bridges WHERE bridges.id = bridge_current_status.bridge_id AND bridges.lifecycle = 'published')
    OR is_super_admin()
    OR is_assigned_operator(bridge_id)
  );

CREATE POLICY p_current_status_write ON bridge_current_status
  FOR ALL USING (
    is_super_admin() 
    OR is_assigned_operator(bridge_id)
  );

-- 5. bridge_status_history: Append-only for admin or assigned operator; No update/delete
CREATE POLICY p_history_select ON bridge_status_history
  FOR SELECT USING (
    is_super_admin() 
    OR is_assigned_operator(bridge_id)
  );

CREATE POLICY p_history_insert ON bridge_status_history
  FOR INSERT WITH CHECK (
    is_super_admin() 
    OR is_assigned_operator(bridge_id)
  );

-- 6. profiles: Users see own profile; admin sees all
CREATE POLICY p_profiles_select ON profiles
  FOR SELECT USING (
    user_id = app_user_id() 
    OR is_super_admin()
  );

CREATE POLICY p_profiles_admin_write ON profiles
  FOR ALL USING (is_super_admin());

-- 7. bridge_assets & viewer configs: Public reads ready/published; admin manages
CREATE POLICY p_assets_select ON bridge_assets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM bridges WHERE bridges.id = bridge_assets.bridge_id AND bridges.lifecycle = 'published')
    OR is_super_admin()
    OR is_assigned_operator(bridge_id)
  );

CREATE POLICY p_assets_admin_write ON bridge_assets
  FOR ALL USING (is_super_admin());

CREATE POLICY p_viewer_config_select ON bridge_viewer_configs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM bridges WHERE bridges.id = bridge_viewer_configs.bridge_id AND bridges.lifecycle = 'published')
    OR is_super_admin()
    OR is_assigned_operator(bridge_id)
  );

CREATE POLICY p_viewer_config_admin_write ON bridge_viewer_configs
  FOR ALL USING (is_super_admin());

-- 8. audit_events: Only super admin can read
CREATE POLICY p_audit_select ON audit_events
  FOR SELECT USING (is_super_admin());

CREATE POLICY p_audit_insert ON audit_events
  FOR INSERT WITH CHECK (true);

-- 9. idempotency_records: Read/write by actor
CREATE POLICY p_idempotency_all ON idempotency_records
  FOR ALL USING (actor_id = app_user_id() OR is_super_admin());

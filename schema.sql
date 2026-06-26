-- ==========================================
-- PHASE 9: DATABASE SCHEMA — PostgreSQL
-- ==========================================
-- Complete schema for THE DOOR production

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==========================================
-- AUTH & USERS
-- ==========================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited')),
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_role ON users(role);

-- ==========================================
-- AUDIT LOG
-- ==========================================

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_action ON audit_log(action);

-- ==========================================
-- LOOPS DATA
-- ==========================================

CREATE TABLE loops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'failed')),
  total_attempts BIGINT DEFAULT 0,
  success_count BIGINT DEFAULT 0,
  failure_count BIGINT DEFAULT 0,
  avg_uptime DECIMAL(5,2) DEFAULT 0,
  last_run TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_loops_status ON loops(status);
CREATE INDEX idx_loops_updated_at ON loops(updated_at DESC);

CREATE TABLE loop_runs (
  id BIGSERIAL PRIMARY KEY,
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'timeout')),
  duration_ms INT,
  error_message TEXT,
  run_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_loop_runs_loop_id ON loop_runs(loop_id);
CREATE INDEX idx_loop_runs_run_at ON loop_runs(run_at DESC);

-- ==========================================
-- CONTEXT/TOKEN TRACKING
-- ==========================================

CREATE TABLE context_tracking (
  id BIGSERIAL PRIMARY KEY,
  tokens_used BIGINT,
  token_budget BIGINT DEFAULT 200000,
  percent_used DECIMAL(5,2),
  active_sessions INT,
  memory_blocks INT,
  compression_score TEXT,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_context_recorded_at ON context_tracking(recorded_at DESC);

-- ==========================================
-- PROJECTS & CLIENTS
-- ==========================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  project_id UUID REFERENCES projects(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_project_id ON clients(project_id);

-- ==========================================
-- ALERTS
-- ==========================================

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_resolved ON alerts(is_resolved);

-- ==========================================
-- ANALYTICS DATA (Time-series)
-- ==========================================

CREATE TABLE metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,2),
  tags JSONB,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_metrics_type_name ON metrics(metric_type, metric_name);
CREATE INDEX idx_metrics_recorded_at ON metrics(recorded_at DESC);

-- ==========================================
-- BACKUPS METADATA
-- ==========================================

CREATE TABLE backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  s3_path TEXT,
  size_bytes BIGINT,
  checksum TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  verified_at TIMESTAMP
);

CREATE INDEX idx_backups_created_at ON backups(created_at DESC);
CREATE INDEX idx_backups_expires_at ON backups(expires_at);

-- ==========================================
-- SESSIONS (For OAuth/Security)
-- ==========================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ==========================================
-- SETTINGS & CONFIG
-- ==========================================

CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_settings_key ON settings(key);

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_loops_updated_at BEFORE UPDATE ON loops
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Admins can see all users
CREATE POLICY "admin_can_view_all_users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    OR id = auth.uid()
  );

-- Viewers can only see their own info
CREATE POLICY "users_can_view_own" ON users
  FOR SELECT USING (id = auth.uid());

-- Audit log only visible to admins
CREATE POLICY "admin_can_view_audit" ON audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ==========================================
-- INITIAL DATA
-- ==========================================

INSERT INTO settings (key, value, is_secret) VALUES
  ('app_version', '2.0.0', FALSE),
  ('max_token_budget', '200000', FALSE),
  ('alert_threshold_warning', '90', FALSE),
  ('alert_threshold_critical', '95', FALSE),
  ('backup_retention_days', '30', FALSE),
  ('monitoring_interval_seconds', '300', FALSE);

-- ==========================================
-- VIEWS (For easier queries)
-- ==========================================

CREATE VIEW loop_stats AS
SELECT
  id,
  name,
  status,
  total_attempts,
  success_count,
  CASE
    WHEN total_attempts = 0 THEN 0
    ELSE ROUND((success_count::NUMERIC / total_attempts) * 100, 2)
  END as success_rate,
  avg_uptime,
  last_run,
  updated_at
FROM loops;

CREATE VIEW active_users AS
SELECT
  id,
  email,
  full_name,
  role,
  last_login,
  status
FROM users
WHERE status = 'active'
ORDER BY last_login DESC;

CREATE VIEW recent_alerts AS
SELECT
  id,
  type,
  severity,
  message,
  is_resolved,
  created_at,
  updated_at
FROM alerts
WHERE is_resolved = FALSE
  OR updated_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;

-- ==========================================
-- COMMENTS (Documentation)
-- ==========================================

COMMENT ON TABLE users IS 'User accounts with Clerk integration';
COMMENT ON TABLE audit_log IS 'Complete audit trail of all changes';
COMMENT ON TABLE loops IS 'Automation loop monitoring';
COMMENT ON TABLE context_tracking IS 'Token budget tracking (time-series)';
COMMENT ON TABLE alerts IS 'System alerts and notifications';
COMMENT ON TABLE backups IS 'Backup metadata and recovery info';

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Composite indexes for common queries
CREATE INDEX idx_loops_status_updated ON loops(status, updated_at DESC);
CREATE INDEX idx_alerts_severity_created ON alerts(severity, created_at DESC);
CREATE INDEX idx_context_tokens ON context_tracking(tokens_used, recorded_at DESC);
CREATE INDEX idx_audit_user_action ON audit_log(user_id, action, created_at DESC);

-- ==========================================
-- ACTIVITY LOG — PROTOCOLO DE VACIADO TOTAL
-- Registro automático de TODA actividad (VSC, Tracker, CLI, Chat)
-- Usado por /api/log-activity.js
-- ==========================================

CREATE TABLE IF NOT EXISTS activity_log (
  id         TEXT PRIMARY KEY,
  "dateKey"  TEXT NOT NULL,
  hora       TEXT NOT NULL,
  desc       TEXT,
  cat        TEXT,
  source     TEXT,              -- VSC | Tracker | CLI | Chat | Git
  action     TEXT,              -- commit|edit|create|generate|message|click|record|event
  project    TEXT DEFAULT 'Tracker Meta',
  client     TEXT DEFAULT 'Victor IA',
  status     TEXT DEFAULT 'Completado',
  priority   TEXT DEFAULT 'Media',
  dur        TEXT DEFAULT 'instantáneo',
  "durSec"   INTEGER DEFAULT 0,
  details    TEXT,
  tags       JSONB DEFAULT '[]'::jsonb,
  "user"     TEXT DEFAULT 'Pablo',
  sw         TEXT,
  rework     INTEGER DEFAULT 0,
  obs        TEXT,
  notes      TEXT,
  auto       BOOLEAN DEFAULT TRUE,
  ts         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_ts     ON activity_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_activity_source ON activity_log(source);
CREATE INDEX IF NOT EXISTS idx_activity_date   ON activity_log("dateKey");

-- ==========================================
-- SCHEMA COMPLETE
-- ==========================================

COMMENT ON SCHEMA public IS 'THE DOOR Production Database Schema - Phase 9';
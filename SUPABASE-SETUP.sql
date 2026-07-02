-- Victor IA Tracker Setup
CREATE TABLE IF NOT EXISTS tracker_results (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  job_id VARCHAR(100) NOT NULL UNIQUE,
  action VARCHAR(50) NOT NULL,
  result_url TEXT,
  result_type VARCHAR(50),
  metadata JSONB,
  status VARCHAR(50) DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracker_job_id ON tracker_results(job_id);
CREATE INDEX IF NOT EXISTS idx_tracker_action ON tracker_results(action);
CREATE INDEX IF NOT EXISTS idx_tracker_created_at ON tracker_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracker_status ON tracker_results(status);

ALTER TABLE tracker_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access" ON tracker_results
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Anon read access" ON tracker_results
  FOR SELECT USING (true);

SELECT COUNT(*) FROM tracker_results;

CREATE TABLE IF NOT EXISTS feedback_reports (
  report_id TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('web', 'ios')),
  received_at TEXT NOT NULL,
  captured_at TEXT,
  disposition TEXT NOT NULL DEFAULT 'new' CHECK (disposition IN ('new','needs_info','actionable','fixed','duplicate','unsupported','not_reproducible','closed_other')),
  app_version TEXT,
  build_number TEXT,
  release_channel TEXT,
  physical_printer TEXT,
  selected_printer TEXT,
  error_code TEXT,
  diagnostic_completeness TEXT NOT NULL CHECK (diagnostic_completeness IN ('complete','minimal','partial')),
  user_content_ciphertext TEXT NOT NULL,
  user_content_iv TEXT NOT NULL,
  diagnostics_json TEXT NOT NULL,
  breadcrumbs_json TEXT NOT NULL,
  issue_fingerprint TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_received_at ON feedback_reports(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_expires_at ON feedback_reports(expires_at);
CREATE INDEX IF NOT EXISTS idx_feedback_fingerprint ON feedback_reports(issue_fingerprint);

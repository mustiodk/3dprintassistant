PRAGMA foreign_keys = ON;

CREATE TABLE push_devices (
  environment TEXT NOT NULL CHECK (environment IN ('development', 'production')),
  token_hash TEXT NOT NULL,
  token_ciphertext TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  encryption_key_version INTEGER NOT NULL CHECK (encryption_key_version >= 1),
  topics INTEGER NOT NULL CHECK (topics BETWEEN 1 AND 3),
  app_version TEXT NOT NULL,
  build_number TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_apns_success_at INTEGER,
  PRIMARY KEY (environment, token_hash)
);

CREATE INDEX idx_push_devices_topic_page
  ON push_devices(environment, topics, token_hash);
CREATE INDEX idx_push_devices_retention
  ON push_devices(updated_at, last_apns_success_at);

CREATE TABLE push_campaigns (
  campaign_id TEXT PRIMARY KEY,
  environment TEXT NOT NULL CHECK (environment IN ('development', 'production')),
  topic TEXT NOT NULL CHECK (topic IN ('new_printers', 'app_updates')),
  kind TEXT NOT NULL CHECK (kind IN ('new_printer', 'app_update')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  brand_id TEXT,
  printer_id TEXT,
  release_version TEXT,
  announcement_id TEXT NOT NULL,
  audience_mode TEXT NOT NULL CHECK (audience_mode IN ('canary', 'public')),
  preview_digest TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('queued', 'sending', 'complete', 'partial', 'blocked', 'cancelled', 'failed')
  ),
  blocked_reason TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  accepted_count INTEGER NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  consent_removed_count INTEGER NOT NULL DEFAULT 0 CHECK (consent_removed_count >= 0),
  token_rotated_count INTEGER NOT NULL DEFAULT 0 CHECK (token_rotated_count >= 0),
  invalid_count INTEGER NOT NULL DEFAULT 0 CHECK (invalid_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0)
);

CREATE INDEX idx_push_campaigns_public_cadence
  ON push_campaigns(audience_mode, created_at DESC);

CREATE TABLE push_deliveries (
  campaign_id TEXT NOT NULL REFERENCES push_campaigns(campaign_id) ON DELETE CASCADE,
  environment TEXT NOT NULL CHECK (environment IN ('development', 'production')),
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'pending',
      'apns_accepted',
      'consent_removed',
      'token_rotated',
      'invalid',
      'retryable',
      'failed'
    )
  ),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_apns_status TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (campaign_id, environment, token_hash)
);

CREATE INDEX idx_push_deliveries_page
  ON push_deliveries(campaign_id, environment, status, token_hash);
CREATE INDEX idx_push_deliveries_retention
  ON push_deliveries(updated_at);

CREATE TABLE push_replay_cursors (
  cursor_id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES push_campaigns(campaign_id),
  cursor_json TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('provider_auth', 'retry_exhausted')),
  status TEXT NOT NULL CHECK (status IN ('preserved', 'replayed', 'cancelled')),
  created_at INTEGER NOT NULL,
  replayed_at INTEGER
);

CREATE INDEX idx_push_replay_campaign_status
  ON push_replay_cursors(campaign_id, status, created_at);

CREATE TRIGGER trg_push_delivery_accepted
AFTER UPDATE OF status ON push_deliveries
WHEN OLD.status IN ('pending', 'retryable') AND NEW.status = 'apns_accepted'
BEGIN
  UPDATE push_campaigns
  SET accepted_count = accepted_count + 1
  WHERE campaign_id = NEW.campaign_id;
END;

CREATE TRIGGER trg_push_delivery_consent_removed
AFTER UPDATE OF status ON push_deliveries
WHEN OLD.status IN ('pending', 'retryable') AND NEW.status = 'consent_removed'
BEGIN
  UPDATE push_campaigns
  SET consent_removed_count = consent_removed_count + 1
  WHERE campaign_id = NEW.campaign_id;
END;

CREATE TRIGGER trg_push_delivery_token_rotated
AFTER UPDATE OF status ON push_deliveries
WHEN OLD.status IN ('pending', 'retryable') AND NEW.status = 'token_rotated'
BEGIN
  UPDATE push_campaigns
  SET token_rotated_count = token_rotated_count + 1
  WHERE campaign_id = NEW.campaign_id;
END;

CREATE TRIGGER trg_push_delivery_invalid
AFTER UPDATE OF status ON push_deliveries
WHEN OLD.status IN ('pending', 'retryable') AND NEW.status = 'invalid'
BEGIN
  UPDATE push_campaigns
  SET invalid_count = invalid_count + 1
  WHERE campaign_id = NEW.campaign_id;
END;

CREATE TRIGGER trg_push_delivery_failed
AFTER UPDATE OF status ON push_deliveries
WHEN OLD.status IN ('pending', 'retryable') AND NEW.status = 'failed'
BEGIN
  UPDATE push_campaigns
  SET failed_count = failed_count + 1
  WHERE campaign_id = NEW.campaign_id;
END;

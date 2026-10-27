-- One row per pseudonymous install per UTC date.
-- The primary key prefix (date, install_hash) serves the upsert, daily reads,
-- and retention deletes. ISO dates sort correctly as text.
-- The partial index serves DAU/WAU/MAU scans, which ignore installs that only
-- recorded replace or error events. Raw events are not stored.
CREATE TABLE usage_daily (
  date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  install_hash TEXT NOT NULL CHECK (
    length(install_hash) = 64 AND install_hash NOT GLOB '*[^0-9a-f]*'
  ),
  translation_count INTEGER NOT NULL DEFAULT 0 CHECK (translation_count >= 0),
  replace_count INTEGER NOT NULL DEFAULT 0 CHECK (replace_count >= 0),
  error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  PRIMARY KEY (date, install_hash)
) WITHOUT ROWID, STRICT;

CREATE INDEX idx_usage_daily_translating
  ON usage_daily (date, install_hash)
  WHERE translation_count > 0;

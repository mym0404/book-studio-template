CREATE TABLE IF NOT EXISTS reading_progress (
  book_slug TEXT PRIMARY KEY,
  page_url TEXT NOT NULL,
  quote TEXT,
  prefix TEXT,
  suffix TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url TEXT NOT NULL,
  quote TEXT NOT NULL,
  prefix TEXT NOT NULL,
  suffix TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  start_offset INTEGER CHECK (start_offset >= 0),
  UNIQUE (page_url, quote, prefix, suffix)
);

CREATE INDEX IF NOT EXISTS annotations_page_url_idx ON annotations (page_url);

CREATE TABLE IF NOT EXISTS public_pages (
  page_url TEXT PRIMARY KEY,
  asset_secret TEXT NOT NULL DEFAULT (
    replace(gen_random_uuid()::text, '-', '') ||
    replace(gen_random_uuid()::text, '-', '')
  )
);

CREATE TABLE IF NOT EXISTS owner_auth (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL CHECK (counter BETWEEN 0 AND 4294967295),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  owner_id SMALLINT NOT NULL DEFAULT 1
    REFERENCES owner_auth (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS auth_challenges (
  token_hash TEXT PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  challenge TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('registration', 'authentication')),
  expires_at TIMESTAMPTZ NOT NULL
);

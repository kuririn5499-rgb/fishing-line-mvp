CREATE TABLE IF NOT EXISTS fishing_tags (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  tag_type    TEXT        NOT NULL CHECK (tag_type IN ('method', 'location')),
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, tag_type, name)
);

ALTER TABLE trips ADD COLUMN IF NOT EXISTS fishing_method TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS location       TEXT;

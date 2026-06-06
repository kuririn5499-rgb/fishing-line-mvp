-- accounts テーブルに LINE/LIFF 認証情報を追加（マルチテナント対応）
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS line_channel_access_token text,
  ADD COLUMN IF NOT EXISTS line_channel_secret text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS prefecture text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

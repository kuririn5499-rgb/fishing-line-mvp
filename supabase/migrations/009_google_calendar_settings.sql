-- accounts テーブルに Google Calendar 設定を追加
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS google_calendar_id text,
  ADD COLUMN IF NOT EXISTS google_service_account_email text,
  ADD COLUMN IF NOT EXISTS google_service_account_private_key text;

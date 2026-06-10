-- 014_add_image_urls_columns.sql
-- message_logs / duty_logs に image_urls 列を追加
-- fishing-report と announcement API はすでにこの列に保存している
ALTER TABLE message_logs
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE duty_logs
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

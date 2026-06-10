-- 013_unread_reports.sql
-- 釣果・お知らせの未読管理用タイムスタンプを customers テーブルに追加
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS last_read_reports_at TIMESTAMPTZ;

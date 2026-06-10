-- 012_commission_rank.sql
-- 船ナビ手数料ランクを accounts テーブルに追加
-- ランク: normal=5%, bronze=4%, silver=3%, gold=2%, platinum=1%
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS commission_rank TEXT NOT NULL DEFAULT 'normal'
  CHECK (commission_rank IN ('normal', 'bronze', 'silver', 'gold', 'platinum'));

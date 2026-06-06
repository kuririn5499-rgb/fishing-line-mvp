-- accounts テーブルにフィーチャーフラグを追加
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS feature_points boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_coupon boolean NOT NULL DEFAULT true;

-- reservations テーブルにクーポン関連カラムを追加
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount integer;

CREATE INDEX IF NOT EXISTS idx_reservations_coupon_id ON reservations(coupon_id);

-- reservations.coupon_id の FK を coupons(id) → user_coupons(id) に変更
-- user_coupon のレコードIDを直接格納することで使用履歴を紐付ける
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_coupon_id_fkey;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_coupon_id_fkey
  FOREIGN KEY (coupon_id) REFERENCES user_coupons(id) ON DELETE SET NULL;

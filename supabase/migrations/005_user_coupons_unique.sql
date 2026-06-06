-- user_coupons に (coupon_id, user_id) のユニーク制約を追加
-- 同じクーポンを同一ユーザーへ重複発行できないようにし、1人1回を保証する
ALTER TABLE user_coupons
  ADD CONSTRAINT user_coupons_coupon_user_unique UNIQUE (coupon_id, user_id);

-- coupons に日程制限カラムを追加
alter table coupons add column if not exists date_restriction text not null default 'none';
alter table coupons add column if not exists specific_dates text; -- JSON配列 例: '["2026-06-14","2026-06-15"]'

-- reservations にクーポン適用カラムを追加
alter table reservations add column if not exists coupon_id uuid references coupons(id) on delete set null;
alter table reservations add column if not exists discount_amount integer;

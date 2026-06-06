-- coupons テーブルに不足カラムを追加
-- date_restriction / specific_dates は既存コードが使用しているが
-- 001_schema.sql に含まれていないため追加する

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS date_restriction text NOT NULL
    CHECK (date_restriction IN ('none','weekdays','weekends','specific'))
    DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS specific_dates text,
  ADD COLUMN IF NOT EXISTS segment text NOT NULL
    CHECK (segment IN ('all','once','five_plus','ten_plus'))
    DEFAULT 'all';

-- trips テーブルの status CHECK 制約に 'closed'（休船）を追加する
ALTER TABLE trips DROP CONSTRAINT trips_status_check;
ALTER TABLE trips ADD CONSTRAINT trips_status_check
  CHECK (status IN ('draft','open','full','confirmed','cancelled','completed','closed'));

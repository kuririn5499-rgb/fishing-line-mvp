-- trips テーブルに1名あたり金額カラムを追加
alter table trips add column if not exists price_per_person integer;

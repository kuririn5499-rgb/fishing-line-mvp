-- trips テーブルに Google Calendar イベント ID カラムを追加
alter table trips add column if not exists gcal_event_id text;

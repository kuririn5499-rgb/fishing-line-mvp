-- 015_line_notify_toggles.sql
-- LINE Push通知のON/OFFをアカウント単位で制御するフラグ
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS notify_line_new_reservation    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_line_cancellation       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_line_trip_request       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_line_request_approved   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_line_reminder           BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_line_departure          BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_line_waitlist           BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_line_point_redemption   BOOLEAN NOT NULL DEFAULT true;

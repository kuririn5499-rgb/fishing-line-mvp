ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS last_read_reservations_at TIMESTAMPTZ;

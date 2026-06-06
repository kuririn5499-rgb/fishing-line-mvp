-- 特典マスタ（船長が設定）
CREATE TABLE IF NOT EXISTS point_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  points_required integer NOT NULL CHECK (points_required > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ポイント特典申請（ユーザーが申請 → 船長が承認/却下）
CREATE TABLE IF NOT EXISTS point_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  reward_id uuid NOT NULL REFERENCES point_rewards(id) ON DELETE RESTRICT,
  points_used integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_redemptions_account ON point_redemptions(account_id);
CREATE INDEX IF NOT EXISTS idx_point_redemptions_user ON point_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_redemptions_status ON point_redemptions(status);

-- =====================================================
-- 遊漁船 LINE 業務システム — DBスキーマ
-- Supabase (PostgreSQL) 用
-- =====================================================

create extension if not exists pgcrypto;

-- =====================
-- accounts
-- =====================
create table accounts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  boat_name text,
  line_channel_id text,
  line_official_account_id text,
  liff_id_customer text,
  liff_id_captain text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================
-- boats
-- =====================
create table boats (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  registration_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================
-- users
-- =====================
create table users (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  line_user_id text not null,
  display_name text,
  picture_url text,
  role text not null check (role in ('customer','captain','staff','operator','admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, line_user_id)
);

-- =====================
-- user_boat_roles
-- =====================
create table user_boat_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  boat_id uuid not null references boats(id) on delete cascade,
  role text not null check (role in ('captain','staff','viewer')),
  created_at timestamptz not null default now(),
  unique (user_id, boat_id)
);

-- =====================
-- customers
-- =====================
create table customers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  full_name text,
  kana_name text,
  phone text,
  postal_code text,
  address text,
  birthday date,
  gender text,
  emergency_name text,
  emergency_phone text,
  life_jacket_owned boolean,
  rental_required boolean,
  fishing_experience text,
  prone_to_seasickness boolean,
  notes text,
  points integer not null default 0,
  last_boarding_at timestamptz,
  boarding_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================
-- trips
-- =====================
create table trips (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  boat_id uuid references boats(id) on delete set null,
  trip_date date not null,
  departure_time time,
  return_time time,
  trip_type text,
  target_species text,
  capacity integer,
  status text not null check (status in ('draft','open','full','confirmed','cancelled','completed')) default 'draft',
  weather_note text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================
-- reservations
-- =====================
create table reservations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  trip_id uuid not null references trips(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  reservation_code text not null unique,
  status text not null check (status in ('pending','confirmed','waitlist','cancelled','completed')) default 'pending',
  passengers_count integer not null default 1,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================
-- boarding_manifests
-- =====================
create table boarding_manifests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  reservation_id uuid not null references reservations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  submitted_by_user_id uuid references users(id) on delete set null,
  full_name text,
  phone text,
  address text,
  emergency_name text,
  emergency_phone text,
  life_jacket_owned boolean,
  rental_required boolean,
  companions_json jsonb not null default '[]'::jsonb,
  notes text,
  submitted_at timestamptz,
  sheet_row_number integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================
-- pre_departure_checks
-- =====================
create table pre_departure_checks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  trip_id uuid not null references trips(id) on delete cascade,
  boat_id uuid references boats(id) on delete set null,
  captain_user_id uuid references users(id) on delete set null,
  chief_user_id uuid references users(id) on delete set null,
  weather text,
  wind text,
  wave text,
  visibility text,
  fuel_checked boolean not null default false,
  battery_checked boolean not null default false,
  engine_checked boolean not null default false,
  bilge_checked boolean not null default false,
  radio_checked boolean not null default false,
  life_saving_equipment_checked boolean not null default false,
  crew_condition_checked boolean not null default false,
  alcohol_checked boolean not null default false,
  departure_judgement text check (departure_judgement in ('go','cancel','hold')),
  cancel_reason text,
  notes text,
  checked_at timestamptz,
  sheet_row_number integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================
-- duty_logs
-- =====================
create table duty_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  trip_id uuid not null references trips(id) on delete cascade,
  boat_id uuid references boats(id) on delete set null,
  captain_user_id uuid references users(id) on delete set null,
  chief_user_id uuid references users(id) on delete set null,
  departure_at timestamptz,
  return_at timestamptz,
  passenger_count integer,
  fishing_area text,
  weather text,
  sea_condition text,
  safety_guidance text,
  incident_report text,
  catch_summary text,
  notes text,
  recorded_at timestamptz,
  sheet_row_number integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================
-- coupons
-- =====================
create table coupons (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  title text not null,
  description text,
  discount_type text check (discount_type in ('amount','percent','benefit')),
  discount_value numeric,
  valid_from timestamptz,
  valid_to timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================
-- user_coupons
-- =====================
create table user_coupons (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null check (status in ('issued','used','expired')) default 'issued',
  issued_at timestamptz not null default now(),
  used_at timestamptz
);

-- =====================
-- point_logs
-- =====================
create table point_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete set null,
  points_delta integer not null,
  reason text,
  created_at timestamptz not null default now()
);

-- =====================
-- message_logs
-- =====================
create table message_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  message_type text,
  title text,
  body text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- =====================
-- インデックス
-- =====================
create index idx_users_account_line on users(account_id, line_user_id);
create index idx_customers_user_id on customers(user_id);
create index idx_reservations_trip_id on reservations(trip_id);
create index idx_manifests_reservation_id on boarding_manifests(reservation_id);
create index idx_pre_checks_trip_id on pre_departure_checks(trip_id);
create index idx_duty_logs_trip_id on duty_logs(trip_id);

-- =====================
-- updated_at 自動更新トリガー
-- =====================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_accounts_updated_at
  before update on accounts for each row execute function update_updated_at();
create trigger trg_boats_updated_at
  before update on boats for each row execute function update_updated_at();
create trigger trg_users_updated_at
  before update on users for each row execute function update_updated_at();
create trigger trg_customers_updated_at
  before update on customers for each row execute function update_updated_at();
create trigger trg_trips_updated_at
  before update on trips for each row execute function update_updated_at();
create trigger trg_reservations_updated_at
  before update on reservations for each row execute function update_updated_at();
create trigger trg_manifests_updated_at
  before update on boarding_manifests for each row execute function update_updated_at();
create trigger trg_pre_departure_updated_at
  before update on pre_departure_checks for each row execute function update_updated_at();
create trigger trg_duty_logs_updated_at
  before update on duty_logs for each row execute function update_updated_at();

-- =====================
-- ポイント加算 RPC（アトミック操作）
-- =====================
create or replace function increment_customer_points(
  p_customer_id uuid,
  p_delta integer
) returns void language plpgsql as $$
begin
  update customers
  set points = points + p_delta,
      updated_at = now()
  where id = p_customer_id;
end;
$$;

-- =====================
-- デモデータ（開発用）
-- =====================
-- アカウント作成後、以下を参考に初期データを投入してください:
-- insert into accounts (slug, name, boat_name, liff_id_customer, liff_id_captain)
-- values ('demo', 'デモ遊漁船', 'デモ丸', 'your-liff-id', 'your-captain-liff-id');

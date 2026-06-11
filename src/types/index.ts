/**
 * 型定義ファイル
 * DBスキーマに対応した TypeScript 型を定義する
 * Supabase の生成型の代わりに手動で管理する
 */

// =====================
// 共通
// =====================

export type Role = "customer" | "captain" | "staff" | "operator" | "admin";

export type TripStatus =
  | "draft"
  | "open"
  | "full"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "closed";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "waitlist"
  | "cancelled"
  | "completed";

export type DepartureJudgement = "go" | "cancel" | "hold";

export type TripRequestStatus = "pending" | "approved" | "rejected";

export interface TripRequest {
  id: string;
  account_id: string;
  user_id: string | null;
  requested_date: string;
  target_species: string | null;
  message: string | null;
  status: TripRequestStatus;
  trip_id: string | null;
  created_at: string;
  updated_at: string;
}

export type DiscountType = "amount" | "percent" | "benefit";
export type DateRestriction = "none" | "weekdays" | "weekends" | "specific";
export type CouponSegment = "all" | "once" | "five_plus" | "ten_plus";

export type CouponStatus = "issued" | "used" | "expired";

export type UserBoatRole = "captain" | "staff" | "viewer";

// =====================
// テーブル型
// =====================

export interface Account {
  id: string;
  slug: string;
  name: string;
  boat_name: string | null;
  line_channel_id: string | null;
  line_official_account_id: string | null;
  liff_id_customer: string | null;
  liff_id_captain: string | null;
  created_at: string;
  updated_at: string;
}

export interface Boat {
  id: string;
  account_id: string;
  name: string;
  registration_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  account_id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBoatRoleRow {
  id: string;
  user_id: string;
  boat_id: string;
  role: UserBoatRole;
  created_at: string;
}

export interface Customer {
  id: string;
  account_id: string;
  user_id: string | null;
  full_name: string | null;
  kana_name: string | null;
  phone: string | null;
  postal_code: string | null;
  address: string | null;
  birthday: string | null; // date
  gender: string | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  life_jacket_owned: boolean | null;
  rental_required: boolean | null;
  fishing_experience: string | null;
  prone_to_seasickness: boolean | null;
  notes: string | null;
  points: number;
  last_boarding_at: string | null;
  boarding_count: number;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  account_id: string;
  boat_id: string | null;
  trip_date: string; // date
  departure_time: string | null; // time
  return_time: string | null; // time
  trip_type: string | null;
  target_species: string | null;
  fishing_method: string | null;
  location: string | null;
  capacity: number | null;
  status: TripStatus;
  price_per_person: number | null;
  weather_note: string | null;
  gcal_event_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  account_id: string;
  trip_id: string;
  customer_id: string | null;
  reservation_code: string;
  status: ReservationStatus;
  passengers_count: number;
  coupon_id: string | null;
  discount_amount: number | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardingManifest {
  id: string;
  account_id: string;
  reservation_id: string;
  customer_id: string | null;
  submitted_by_user_id: string | null;
  full_name: string | null;
  age: number | null;
  phone: string | null;
  address: string | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  life_jacket_owned: boolean | null;
  rental_required: boolean | null;
  companions_json: CompanionEntry[];
  notes: string | null;
  submitted_at: string | null;
  sheet_row_number: number | null;
  created_at: string;
  updated_at: string;
}

/** 同行者エントリ（companions_json の要素） */
export interface CompanionEntry {
  full_name: string;
  age?: number;
  phone?: string;
  address?: string;
  emergency_phone?: string;
  notes?: string;
}

export interface PreDepartureCheck {
  id: string;
  account_id: string;
  trip_id: string;
  boat_id: string | null;
  captain_user_id: string | null;
  chief_user_id: string | null;
  weather: string | null;
  wind: string | null;
  wave: string | null;
  visibility: string | null;
  // 安全確認チェック項目
  hull_checked: boolean;
  bilge_checked: boolean;
  fuel_checked: boolean;
  fuel_valve_checked: boolean;
  engine_oil_checked: boolean;
  coolant_checked: boolean;
  battery_checked: boolean;
  life_saving_equipment_checked: boolean;
  radio_checked: boolean;
  equipment_compliance_checked: boolean;
  rescue_ladder_checked: boolean;
  landing_steps_checked: boolean;
  fishing_gear_checked: boolean;
  gauges_checked: boolean;
  cooling_water_checked: boolean;
  engine_checked: boolean;
  // アルコール・健康確認
  alcohol_checked: boolean;
  crew_condition_checked: boolean;
  // テキスト項目
  issue_notes: string | null;
  inspector_name: string | null;
  inspection_location: string | null;
  alcohol_test_value: string | null;
  notes: string | null;
  // 出船判断（別ボタンから更新）
  departure_judgement: DepartureJudgement | null;
  cancel_reason: string | null;
  checked_at: string | null;
  sheet_row_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface DutyLog {
  id: string;
  account_id: string;
  trip_id: string;
  boat_id: string | null;
  captain_user_id: string | null;
  chief_user_id: string | null;
  departure_at: string | null;
  return_at: string | null;
  departure_location: string | null;
  arrival_location: string | null;
  captain_name: string | null;
  passenger_count: number | null;
  fishing_area: string | null;
  weather: string | null;
  sea_condition: string | null;
  catch_summary: string | null;
  incident_report: string | null;
  emergency_contact_log: string | null;
  operator_opinion: string | null;
  safety_guidance: string | null;
  notes: string | null;
  recorded_at: string | null;
  sheet_row_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  account_id: string;
  title: string;
  description: string | null;
  discount_type: DiscountType | null;
  discount_value: number | null;
  date_restriction: DateRestriction;
  specific_dates: string | null;  // JSON配列
  segment: CouponSegment;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UserCoupon {
  id: string;
  coupon_id: string;
  user_id: string;
  status: CouponStatus;
  issued_at: string;
  used_at: string | null;
}

export interface PointReward {
  id: string;
  account_id: string;
  title: string;
  description: string | null;
  points_required: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type RedemptionStatus = "pending" | "approved" | "rejected";

export interface PointRedemption {
  id: string;
  account_id: string;
  user_id: string;
  customer_id: string | null;
  reward_id: string;
  points_used: number;
  status: RedemptionStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface PointLog {
  id: string;
  account_id: string;
  customer_id: string;
  reservation_id: string | null;
  points_delta: number;
  reason: string | null;
  created_at: string;
}

// =====================
// セッション / Auth
// =====================

/** サーバーセッション型（Server Actions / Route Handler から返す） */
export interface SessionUser {
  userId: string;
  accountId: string;
  accountSlug: string;
  lineUserId: string;
  displayName: string | null;
  pictureUrl: string | null;
  role: Role;
}

// =====================
// API レスポンス共通
// =====================

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

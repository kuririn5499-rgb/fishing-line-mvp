/**
 * Zod バリデーションスキーマ
 * フォーム入力値・API リクエストボディの検証に使用する
 */

import { z } from "zod";

// =====================
// 共通
// =====================

const phoneRegex = /^[0-9\-+() ]{7,20}$/;
const postalCodeRegex = /^\d{3}-?\d{4}$/;

// =====================
// 認証
// =====================

/** LIFF トークンをサーバーへ送る際のリクエスト */
export const AuthRequestSchema = z.object({
  idToken: z.string().min(1, "idToken は必須です"),
  accountSlug: z.string().min(1, "accountSlug は必須です"),
  displayName: z.string().optional(),
  pictureUrl: z.string().optional(),
});
export type AuthRequest = z.infer<typeof AuthRequestSchema>;

// =====================
// 便（Trip）
// =====================

export const TripCreateSchema = z.object({
  boat_id: z.string().uuid("boat_id は UUID で指定してください").optional(),
  trip_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で入力してください"),
  status: z.enum(["open", "closed"]).default("open"),
  departure_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "HH:MM 形式で入力してください")
    .optional()
    .or(z.literal("")),
  return_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "HH:MM 形式で入力してください")
    .optional()
    .or(z.literal("")),
  trip_type: z.string().max(100).optional(),
  target_species: z.string().max(200).optional(),
  fishing_method: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  capacity: z.coerce.number().int().min(1).max(100).optional(),
  price_per_person: z.coerce.number().int().min(0).max(1000000).optional(),
  weather_note: z.string().max(500).optional(),
});
export type TripCreate = z.infer<typeof TripCreateSchema>;

export const TripStatusUpdateSchema = z.object({
  trip_id: z.string().uuid(),
  status: z.enum(["draft", "open", "full", "confirmed", "cancelled", "completed", "closed"]),
});
export type TripStatusUpdate = z.infer<typeof TripStatusUpdateSchema>;

// =====================
// 予約（Reservation）
// =====================

export const ReservationCreateSchema = z.object({
  trip_id: z.string().uuid("便 ID は必須です"),
  customer_name: z.string().min(1, "お名前は必須です").max(100),
  customer_phone: z.string().regex(phoneRegex, "電話番号の形式が正しくありません").min(1, "電話番号は必須です"),
  passengers_count: z.coerce.number().int().min(1, "乗船人数は1名以上です").max(20),
  coupon_id: z.string().uuid().optional(),
  memo: z.string().max(500).optional(),
  waitlist: z.boolean().optional(),
});
export type ReservationCreate = z.infer<typeof ReservationCreateSchema>;

/** 船長が電話受付などで手動入力する予約スキーマ */
export const CaptainReservationCreateSchema = z.object({
  trip_id: z.string().uuid("便を選択してください"),
  customer_name: z.string().min(1, "氏名は必須です").max(100),
  customer_phone: z
    .string()
    .regex(phoneRegex, "電話番号の形式が正しくありません")
    .optional()
    .or(z.literal("")),
  passengers_count: z.coerce.number().int().min(1, "乗船人数は1名以上です").max(20),
  memo: z.string().max(500).optional(),
  status: z.enum(["pending", "confirmed"]).default("confirmed"),
});
export type CaptainReservationCreate = z.infer<typeof CaptainReservationCreateSchema>;

// =====================
// 乗船名簿（BoardingManifest）
// =====================

const CompanionSchema = z.object({
  full_name: z.string().min(1, "氏名は必須です").max(100),
  age: z.coerce.number().int().min(0).max(150).optional(),
  phone: z.string().regex(phoneRegex, "電話番号の形式が正しくありません").optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  emergency_phone: z.string().regex(phoneRegex, "緊急連絡先の形式が正しくありません").optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const ManifestSubmitSchema = z.object({
  reservation_id: z.string().uuid("予約 ID は必須です"),
  full_name: z.string().min(1, "氏名は必須です").max(100),
  age: z.coerce.number().int().min(0).max(150).optional(),
  phone: z.string().regex(phoneRegex, "電話番号の形式が正しくありません"),
  address: z.string().min(1, "住所は必須です").max(300),
  emergency_name: z.string().max(100).optional().or(z.literal("")),
  emergency_phone: z.string().regex(phoneRegex, "緊急連絡先電話番号の形式が正しくありません"),
  life_jacket_owned: z.boolean().optional().default(false),
  rental_required: z.boolean().optional().default(false),
  companions: z.array(CompanionSchema).max(19).optional().default([]),
  notes: z.string().max(500).optional(),
});
export type ManifestSubmit = z.infer<typeof ManifestSubmitSchema>;

// QR ビジター経由の名簿提出（予約も同時作成）
export const VisitorManifestSchema = z.object({
  account_id: z.string().uuid(),
  trip_id: z.string().uuid(),
  passengers_count: z.coerce.number().int().min(1).max(20),
  full_name: z.string().min(1, "氏名は必須です").max(100),
  age: z.coerce.number().int().min(0).max(150).optional(),
  phone: z.string().regex(phoneRegex, "電話番号の形式が正しくありません"),
  address: z.string().min(1, "住所は必須です").max(300),
  emergency_name: z.string().max(100).optional().or(z.literal("")),
  emergency_phone: z.string().regex(phoneRegex, "緊急連絡先電話番号の形式が正しくありません"),
  companions: z.array(CompanionSchema).max(19).optional().default([]),
  notes: z.string().max(500).optional(),
});
export type VisitorManifest = z.infer<typeof VisitorManifestSchema>;

// =====================
// 出船前検査（PreDepartureCheck）
// =====================

export const PreDepartureCheckSchema = z.object({
  trip_id: z.string().uuid("便 ID は必須です"),
  boat_id: z.string().uuid().optional(),
  // 安全確認チェック項目
  hull_checked: z.boolean(),
  bilge_checked: z.boolean(),
  fuel_checked: z.boolean(),
  fuel_valve_checked: z.boolean(),
  engine_oil_checked: z.boolean(),
  coolant_checked: z.boolean(),
  battery_checked: z.boolean(),
  life_saving_equipment_checked: z.boolean(),
  radio_checked: z.boolean(),
  equipment_compliance_checked: z.boolean(),
  rescue_ladder_checked: z.boolean(),
  landing_steps_checked: z.boolean(),
  fishing_gear_checked: z.boolean(),
  gauges_checked: z.boolean(),
  cooling_water_checked: z.boolean(),
  engine_checked: z.boolean(),
  // アルコール・健康確認
  alcohol_checked: z.boolean(),
  crew_condition_checked: z.boolean(),
  // テキスト項目
  issue_notes: z.string().max(500).optional(),
  inspector_name: z.string().max(100).optional(),
  inspection_location: z.string().max(200).optional(),
  alcohol_test_value: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});
export type PreDepartureCheckForm = z.infer<typeof PreDepartureCheckSchema>;

// 出船判断通知（便管理画面の別ボタン）
export const DepartureNoticeSchema = z.object({
  judgement: z.enum(["go", "cancel"]),
  cancel_reason: z.string().max(500).optional(),
});
export type DepartureNotice = z.infer<typeof DepartureNoticeSchema>;

// =====================
// 乗務記録（DutyLog）
// =====================

export const DutyLogSchema = z.object({
  trip_id: z.string().uuid("便 ID は必須です"),
  boat_id: z.string().uuid().optional(),
  departure_at: z.string().optional(),
  return_at: z.string().optional(),
  departure_location: z.string().max(200).optional(),
  arrival_location: z.string().max(200).optional(),
  captain_name: z.string().max(100).optional(),
  passenger_count: z.coerce.number().int().min(0).max(200).optional(),
  weather: z.string().max(1000).optional(),
  fishing_area: z.string().max(200).optional(),
  catch_summary: z.string().max(2000).optional(),
  incident_report: z.string().max(2000).optional(),
  emergency_contact_log: z.string().max(2000).optional(),
  operator_opinion: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
});
export type DutyLogForm = z.infer<typeof DutyLogSchema>;

// =====================
// クーポン
// =====================

export const CouponCreateSchema = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  discount_type: z.enum(["amount", "percent", "benefit"]).optional(),
  discount_value: z.coerce
    .number()
    .int("整数で入力してください")
    .min(100, "100円以上で入力してください")
    .max(100000, "100,000円以下で入力してください")
    .optional(),
  date_restriction: z.enum(["none", "weekdays", "weekends", "specific"]).default("none"),
  specific_dates: z.string().optional(), // "YYYY-MM-DD,YYYY-MM-DD,..."
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  is_active: z.boolean().default(true),
  segment: z.enum(["all", "once", "five_plus", "ten_plus"]).default("all"),
});
export type CouponCreate = z.infer<typeof CouponCreateSchema>;

// =====================
// ポイント付与
// =====================

export const PointGrantSchema = z.object({
  customer_id: z.string().uuid(),
  points_delta: z.number().int(),
  reason: z.string().max(200).optional(),
  reservation_id: z.string().uuid().optional(),
});
export type PointGrant = z.infer<typeof PointGrantSchema>;

// =====================
// 便リクエスト
// =====================

export const TripRequestCreateSchema = z.object({
  requested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付を選択してください"),
  target_species: z.string().max(200).optional(),
  message: z.string().max(500).optional(),
});
export type TripRequestCreate = z.infer<typeof TripRequestCreateSchema>;

export const TripRequestApproveSchema = z.object({
  boat_id: z.string().uuid().optional(),
  target_species: z.string().max(200).optional(),
  fishing_method: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  departure_time: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM 形式で入力してください").optional().or(z.literal("")),
  return_time: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM 形式で入力してください").optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1).max(100).optional(),
  price_per_person: z.coerce.number().int().min(0).max(1000000).optional(),
});
export type TripRequestApprove = z.infer<typeof TripRequestApproveSchema>;

// =====================
// ユーザー管理（admin）
// =====================

export const UserRoleUpdateSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["customer", "captain", "staff", "operator", "admin"]),
});
export type UserRoleUpdate = z.infer<typeof UserRoleUpdateSchema>;

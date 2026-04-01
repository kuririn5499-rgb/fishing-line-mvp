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
});
export type AuthRequest = z.infer<typeof AuthRequestSchema>;

// =====================
// 便（Trip）
// =====================

export const TripCreateSchema = z.object({
  boat_id: z.string().uuid("boat_id は UUID で指定してください").optional(),
  trip_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で入力してください"),
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
  capacity: z.coerce.number().int().min(1).max(100).optional(),
  weather_note: z.string().max(500).optional(),
});
export type TripCreate = z.infer<typeof TripCreateSchema>;

export const TripStatusUpdateSchema = z.object({
  trip_id: z.string().uuid(),
  status: z.enum(["draft", "open", "full", "confirmed", "cancelled", "completed"]),
});
export type TripStatusUpdate = z.infer<typeof TripStatusUpdateSchema>;

// =====================
// 予約（Reservation）
// =====================

export const ReservationCreateSchema = z.object({
  trip_id: z.string().uuid("便 ID は必須です"),
  passengers_count: z.coerce.number().int().min(1, "乗船人数は1名以上です").max(20),
  memo: z.string().max(500).optional(),
});
export type ReservationCreate = z.infer<typeof ReservationCreateSchema>;

// =====================
// 乗船名簿（BoardingManifest）
// =====================

const CompanionSchema = z.object({
  full_name: z.string().min(1, "同行者名は必須です").max(100),
  phone: z.string().regex(phoneRegex, "電話番号の形式が正しくありません").optional().or(z.literal("")),
  emergency_name: z.string().max(100).optional(),
  emergency_phone: z.string().regex(phoneRegex, "電話番号の形式が正しくありません").optional().or(z.literal("")),
  life_jacket_owned: z.boolean().optional(),
  rental_required: z.boolean().optional(),
});

export const ManifestSubmitSchema = z.object({
  reservation_id: z.string().uuid("予約 ID は必須です"),
  full_name: z.string().min(1, "氏名は必須です").max(100),
  phone: z.string().regex(phoneRegex, "電話番号の形式が正しくありません"),
  address: z.string().min(1, "住所は必須です").max(300),
  emergency_name: z.string().min(1, "緊急連絡先氏名は必須です").max(100),
  emergency_phone: z.string().regex(phoneRegex, "緊急連絡先電話番号の形式が正しくありません"),
  life_jacket_owned: z.boolean(),
  rental_required: z.boolean(),
  companions: z.array(CompanionSchema).max(19, "同行者は最大19名です"),
  notes: z.string().max(500).optional(),
});
export type ManifestSubmit = z.infer<typeof ManifestSubmitSchema>;

// =====================
// 出船前検査（PreDepartureCheck）
// =====================

export const PreDepartureCheckSchema = z.object({
  trip_id: z.string().uuid("便 ID は必須です"),
  boat_id: z.string().uuid().optional(),
  weather: z.string().max(100).optional(),
  wind: z.string().max(100).optional(),
  wave: z.string().max(100).optional(),
  visibility: z.string().max(100).optional(),
  fuel_checked: z.boolean(),
  battery_checked: z.boolean(),
  engine_checked: z.boolean(),
  bilge_checked: z.boolean(),
  radio_checked: z.boolean(),
  life_saving_equipment_checked: z.boolean(),
  crew_condition_checked: z.boolean(),
  alcohol_checked: z.boolean(),
  departure_judgement: z.enum(["go", "cancel", "hold"]),
  cancel_reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});
export type PreDepartureCheckForm = z.infer<typeof PreDepartureCheckSchema>;

// =====================
// 乗務記録（DutyLog）
// =====================

export const DutyLogSchema = z.object({
  trip_id: z.string().uuid("便 ID は必須です"),
  boat_id: z.string().uuid().optional(),
  departure_at: z.string().optional(), // ISO string
  return_at: z.string().optional(),
  passenger_count: z.coerce.number().int().min(0).max(200).optional(),
  fishing_area: z.string().max(200).optional(),
  weather: z.string().max(100).optional(),
  sea_condition: z.string().max(100).optional(),
  safety_guidance: z.string().max(1000).optional(),
  incident_report: z.string().max(2000).optional(),
  catch_summary: z.string().max(2000).optional(),
  notes: z.string().max(1000).optional(),
});
export type DutyLogForm = z.infer<typeof DutyLogSchema>;

// =====================
// クーポン
// =====================

export const CouponCreateSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(100),
  description: z.string().max(500).optional(),
  discount_type: z.enum(["amount", "percent", "benefit"]).optional(),
  discount_value: z.coerce.number().min(0).max(100000).optional(),
  valid_from: z.string().optional(), // ISO string
  valid_to: z.string().optional(),
  is_active: z.boolean().default(true),
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
// ユーザー管理（admin）
// =====================

export const UserRoleUpdateSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["customer", "captain", "staff", "operator", "admin"]),
});
export type UserRoleUpdate = z.infer<typeof UserRoleUpdateSchema>;

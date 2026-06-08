/**
 * Google Sheets API ヘルパー
 * Supabase を正本として、Sheets にミラー保存する。
 *
 * シート構成（setup-spreadsheet.mjs で自動作成）:
 *  - "予約"        : Reservation
 *  - "乗船名簿"    : BoardingManifest
 *  - "出船前点検"  : PreDepartureCheck
 *  - "乗務記録"    : DutyLog
 */

import { google } from "googleapis";
import type { BoardingManifest, PreDepartureCheck, DutyLog } from "@/types";

// =====================
// 認証情報解決
// =====================

export interface SheetsCreds {
  spreadsheetId: string;
  email: string;
  key: string;
}

/**
 * アカウント行から Sheets 認証情報を解決する。
 * DB 値を優先し、未設定なら環境変数にフォールバックする。
 */
export function resolveSheetsCreds(
  account: {
    google_spreadsheet_id?: string | null;
    google_service_account_email?: string | null;
    google_service_account_private_key?: string | null;
  } | null
): SheetsCreds | null {
  const spreadsheetId =
    account?.google_spreadsheet_id || process.env.GOOGLE_SPREADSHEET_ID;
  const email =
    account?.google_service_account_email ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey =
    account?.google_service_account_private_key ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!spreadsheetId || !email || !rawKey) return null;

  return {
    spreadsheetId,
    email,
    key: rawKey.replace(/\\n/g, "\n"),
  };
}

function buildSheetsClient(creds: SheetsCreds) {
  const auth = new google.auth.JWT({
    email: creds.email,
    key: creds.key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

/** 追記後の行番号を解析して返す共通ヘルパー */
function parseRowNumber(updatedRange: string | null | undefined): number {
  const match = (updatedRange ?? "").match(/:([A-Z]+)(\d+)$/);
  return match ? parseInt(match[2], 10) : 0;
}

// =====================
// 予約
// =====================
// 列: 出船日 | 予約コード | 便ID | お名前 | 乗船人数 | ステータス | メモ | 予約日時
// 範囲: A:H

export async function appendReservationToSheet(
  tripDate: string,
  reservationCode: string,
  tripId: string,
  customerName: string,
  customerPhone: string,
  passengersCount: number,
  status: string,
  memo: string | null,
  createdAt: string,
  creds: SheetsCreds
): Promise<number> {
  const sheets = buildSheetsClient(creds);

  const row = [
    tripDate,
    reservationCode,
    tripId,
    customerName,
    customerPhone,
    String(passengersCount),
    status,
    memo ?? "",
    createdAt,
  ];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: creds.spreadsheetId,
    range: "予約!A:I",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  return parseRowNumber(res.data.updates?.updatedRange);
}

// =====================
// 乗船名簿
// =====================
// 列: 出船日 | 氏名 | 年齢 | 電話番号 | 住所 | 緊急連絡先電話番号 | 備考
// 範囲: A:G
// ※ 代表者 + 同行者それぞれ1行ずつ追記

export async function appendManifestToSheet(
  manifest: BoardingManifest,
  reservationCode: string,
  tripDate: string,
  creds: SheetsCreds
): Promise<number> {
  const sheets = buildSheetsClient(creds);

  const makeRow = (person: {
    full_name?: string | null;
    age?: number | null;
    phone?: string | null;
    address?: string | null;
    emergency_phone?: string | null;
    notes?: string | null;
  }) => [
    tripDate,
    person.full_name ?? "",
    person.age != null ? String(person.age) : "",
    person.phone ?? "",
    person.address ?? "",
    person.emergency_phone ?? "",
    person.notes ?? "",
  ];

  const companions = manifest.companions_json ?? [];
  const rows = [
    makeRow(manifest),
    ...companions.map((c) => makeRow(c)),
  ];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: creds.spreadsheetId,
    range: "乗船名簿!A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });

  const lastRow = parseRowNumber(res.data.updates?.updatedRange);
  return lastRow > 0 ? lastRow - rows.length + 1 : 0;
}

// =====================
// 出船前点検
// =====================

export async function appendPreDepartureToSheet(
  check: PreDepartureCheck,
  tripDate: string,
  boatName: string,
  creds: SheetsCreds
): Promise<number> {
  const sheets = buildSheetsClient(creds);
  const b = (v: boolean) => (v ? "✓" : "✗");

  const row = [
    tripDate,
    boatName,
    check.weather ?? "",
    check.wind ?? "",
    check.wave ?? "",
    check.visibility ?? "",
    b(check.hull_checked),
    b(check.bilge_checked),
    b(check.fuel_checked),
    b(check.fuel_valve_checked),
    b(check.engine_oil_checked),
    b(check.coolant_checked),
    b(check.battery_checked),
    b(check.life_saving_equipment_checked),
    b(check.radio_checked),
    b(check.equipment_compliance_checked),
    b(check.rescue_ladder_checked),
    b(check.landing_steps_checked),
    b(check.fishing_gear_checked),
    b(check.gauges_checked),
    b(check.cooling_water_checked),
    b(check.engine_checked),
    b(check.alcohol_checked),
    b(check.crew_condition_checked),
    check.issue_notes ?? "",
    check.inspector_name ?? "",
    check.inspection_location ?? "",
    check.alcohol_test_value ?? "",
    check.notes ?? "",
    check.departure_judgement ?? "",
    check.cancel_reason ?? "",
    check.checked_at ?? new Date().toISOString(),
  ];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: creds.spreadsheetId,
    range: "出船前点検!A:AF",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  return parseRowNumber(res.data.updates?.updatedRange);
}

// =====================
// 乗務記録
// =====================

export async function appendDutyLogToSheet(
  log: DutyLog,
  tripDate: string,
  boatName: string,
  creds: SheetsCreds
): Promise<number> {
  const sheets = buildSheetsClient(creds);

  const row = [
    tripDate,
    boatName,
    log.departure_at ?? "",
    log.return_at ?? "",
    log.departure_location ?? "",
    log.arrival_location ?? "",
    log.captain_name ?? "",
    String(log.passenger_count ?? ""),
    log.fishing_area ?? "",
    log.weather ?? "",
    log.sea_condition ?? "",
    log.catch_summary ?? "",
    log.incident_report ?? "",
    log.emergency_contact_log ?? "",
    log.operator_opinion ?? "",
    log.safety_guidance ?? "",
    log.notes ?? "",
    log.recorded_at ?? new Date().toISOString(),
  ];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: creds.spreadsheetId,
    range: "乗務記録!A:R",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  return parseRowNumber(res.data.updates?.updatedRange);
}

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

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("Google サービスアカウント設定が不足しています");

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID ?? "";

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
  passengersCount: number,
  status: string,
  memo: string | null,
  createdAt: string
): Promise<number> {
  const sheets = getSheetsClient();

  const row = [
    tripDate,
    reservationCode,
    tripId,
    customerName,
    String(passengersCount),
    status,
    memo ?? "",
    createdAt,
  ];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "予約!A:H",
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
  tripDate: string
): Promise<number> {
  const sheets = getSheetsClient();

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
    spreadsheetId: SPREADSHEET_ID,
    range: "乗船名簿!A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });

  // 先頭行番号を返す（最終行番号 - 追記行数 + 1）
  const lastRow = parseRowNumber(res.data.updates?.updatedRange);
  return lastRow > 0 ? lastRow - rows.length + 1 : 0;
}

// =====================
// 出船前点検
// =====================
// 列 A〜AF (32列):
//   出船日 | 船名 | 天候 | 風力 | 波浪 | 視界
//   | 船体 | 排水 | 燃料 | 燃料弁 | エンジン油 | 冷却水 | バッテリー | 救命設備
//   | 無線 | 法定備品 | 救助はしご | 乗降ステップ | 釣具 | 計器類 | 冷却水確認 | エンジン確認
//   | アルコール | 船員状態
//   | 不具合事項 | 点検者 | 点検場所 | アルコール数値 | 備考
//   | 出船判断 | 中止理由 | 検査日時

export async function appendPreDepartureToSheet(
  check: PreDepartureCheck,
  tripDate: string,
  boatName: string
): Promise<number> {
  const sheets = getSheetsClient();
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
    spreadsheetId: SPREADSHEET_ID,
    range: "出船前点検!A:AF",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  return parseRowNumber(res.data.updates?.updatedRange);
}

// =====================
// 乗務記録
// =====================
// 列 A〜R (18列):
//   出船日 | 船名 | 出港時刻 | 帰港時刻 | 出港場所 | 帰港場所 | 船長名 | 乗船者数
//   | 釣り場 | 天候 | 海況 | 漁獲概要 | 事故報告 | 緊急連絡記録 | 運航者所見 | 安全指導 | 備考 | 記録日時

export async function appendDutyLogToSheet(
  log: DutyLog,
  tripDate: string,
  boatName: string
): Promise<number> {
  const sheets = getSheetsClient();

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
    spreadsheetId: SPREADSHEET_ID,
    range: "乗務記録!A:R",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  return parseRowNumber(res.data.updates?.updatedRange);
}

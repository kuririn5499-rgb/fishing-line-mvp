/**
 * Google Sheets API ヘルパー
 * Supabase を正本として、Sheets にミラー保存する。
 *
 * シート名の規則:
 *  - "乗船名簿" : BoardingManifest
 *  - "出船前検査" : PreDepartureCheck
 *  - "乗務記録" : DutyLog
 */

import { google } from "googleapis";
import type { BoardingManifest, PreDepartureCheck, DutyLog } from "@/types";

/** Google Sheets クライアントを生成する */
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

// =====================
// 乗船名簿
// =====================

/** 乗船名簿を Sheets に追記する */
export async function appendManifestToSheet(
  manifest: BoardingManifest,
  reservationCode: string,
  tripDate: string
): Promise<number> {
  const sheets = getSheetsClient();
  const companions = manifest.companions_json ?? [];
  const companionSummary = companions
    .map((c) => c.full_name)
    .join("、");

  const row = [
    tripDate,
    reservationCode,
    manifest.full_name ?? "",
    manifest.phone ?? "",
    manifest.address ?? "",
    manifest.emergency_name ?? "",
    manifest.emergency_phone ?? "",
    manifest.life_jacket_owned ? "持参" : "なし",
    manifest.rental_required ? "要レンタル" : "不要",
    String(companions.length),
    companionSummary,
    manifest.notes ?? "",
    manifest.submitted_at ?? new Date().toISOString(),
  ];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "乗船名簿!A:M",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  // 追記された行番号を返す（次回の更新用）
  const updatedRange = res.data.updates?.updatedRange ?? "";
  const match = updatedRange.match(/:([A-Z]+)(\d+)$/);
  return match ? parseInt(match[2], 10) : 0;
}

// =====================
// 出船前検査
// =====================

/** 出船前検査を Sheets に追記する */
export async function appendPreDepartureToSheet(
  check: PreDepartureCheck,
  tripDate: string,
  boatName: string
): Promise<number> {
  const sheets = getSheetsClient();

  const boolMark = (v: boolean) => (v ? "✓" : "✗");

  const row = [
    tripDate,
    boatName,
    check.weather ?? "",
    check.wind ?? "",
    check.wave ?? "",
    check.visibility ?? "",
    boolMark(check.fuel_checked),
    boolMark(check.battery_checked),
    boolMark(check.engine_checked),
    boolMark(check.bilge_checked),
    boolMark(check.radio_checked),
    boolMark(check.life_saving_equipment_checked),
    boolMark(check.crew_condition_checked),
    boolMark(check.alcohol_checked),
    check.departure_judgement ?? "",
    check.cancel_reason ?? "",
    check.notes ?? "",
    check.checked_at ?? new Date().toISOString(),
  ];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "出船前検査!A:R",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  const updatedRange = res.data.updates?.updatedRange ?? "";
  const match = updatedRange.match(/:([A-Z]+)(\d+)$/);
  return match ? parseInt(match[2], 10) : 0;
}

// =====================
// 乗務記録
// =====================

/** 乗務記録を Sheets に追記する */
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
    String(log.passenger_count ?? ""),
    log.fishing_area ?? "",
    log.weather ?? "",
    log.sea_condition ?? "",
    log.safety_guidance ?? "",
    log.incident_report ?? "",
    log.catch_summary ?? "",
    log.notes ?? "",
    log.recorded_at ?? new Date().toISOString(),
  ];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "乗務記録!A:M",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  const updatedRange = res.data.updates?.updatedRange ?? "";
  const match = updatedRange.match(/:([A-Z]+)(\d+)$/);
  return match ? parseInt(match[2], 10) : 0;
}

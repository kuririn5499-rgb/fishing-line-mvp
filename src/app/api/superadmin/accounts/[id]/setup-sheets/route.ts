/**
 * POST /api/superadmin/accounts/[id]/setup-sheets
 * スプレッドシートに4タブ＋ヘッダー行を自動作成・初期化する
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase";
import { google } from "googleapis";

async function checkAuth() {
  const store = await cookies();
  return store.get("superadmin_token")?.value === process.env.SUPERADMIN_SECRET;
}

const SHEETS_DEF = [
  {
    title: "予約",
    headers: ["出船日", "予約コード", "便ID", "お名前", "電話番号", "乗船人数", "ステータス", "メモ", "予約日時"],
  },
  {
    title: "乗船名簿",
    headers: ["出船日", "氏名", "年齢", "電話番号", "住所", "緊急連絡先電話番号", "備考"],
  },
  {
    title: "出船前点検",
    headers: [
      "出船日", "船名", "天候", "風力", "波浪", "視界",
      "船体", "排水", "燃料", "燃料弁", "エンジン油", "冷却水", "バッテリー",
      "救命設備", "無線", "法定備品", "救助はしご", "乗降ステップ",
      "釣具", "計器類", "冷却水確認", "エンジン確認", "アルコール", "船員状態",
      "不具合事項", "点検者", "点検場所", "アルコール数値", "備考",
      "出船判断", "中止理由", "検査日時",
    ],
  },
  {
    title: "乗務記録",
    headers: [
      "出船日", "船名", "出港時刻", "帰港時刻", "出港場所", "帰港場所",
      "船長名", "乗船者数", "釣り場", "天候", "海況",
      "漁獲概要", "事故報告", "緊急連絡記録", "運航者所見", "安全指導", "備考", "記録日時",
    ],
  },
];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("google_spreadsheet_id, google_service_account_email, google_service_account_private_key")
    .eq("id", id)
    .maybeSingle();

  const spreadsheetId = account?.google_spreadsheet_id;
  const email = account?.google_service_account_email || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = account?.google_service_account_private_key || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!spreadsheetId) {
    return NextResponse.json({ error: "スプレッドシートIDが設定されていません。先に保存してください。" }, { status: 400 });
  }
  if (!email || !rawKey) {
    return NextResponse.json({ error: "サービスアカウントのEmail/秘密鍵が設定されていません。" }, { status: 400 });
  }

  const auth = new google.auth.JWT({
    email,
    key: rawKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  // 現在のシート情報を取得
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetIdMap: Record<string, number> = {};
  for (const s of spreadsheet.data.sheets ?? []) {
    const title = s.properties?.title;
    const sid = s.properties?.sheetId;
    if (title && sid != null) sheetIdMap[title] = sid;
  }

  // 不足しているタブを追加
  const missing = SHEETS_DEF.filter((s) => !(s.title in sheetIdMap));
  if (missing.length > 0) {
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: missing.map((s) => ({
          addSheet: { properties: { title: s.title } },
        })),
      },
    });
    for (const reply of addRes.data.replies ?? []) {
      const props = reply.addSheet?.properties;
      if (props?.title && props.sheetId != null) {
        sheetIdMap[props.title] = props.sheetId;
      }
    }
  }

  // ヘッダー行を書き込む（1行目に上書き）
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: SHEETS_DEF.map((s) => ({
        range: `${s.title}!A1`,
        values: [s.headers],
      })),
    },
  });

  // 書式（青ヘッダー・太字・列幅自動・1行目固定）を適用
  const formatRequests = [];
  for (const s of SHEETS_DEF) {
    const sid = sheetIdMap[s.title];
    if (sid == null) continue;
    formatRequests.push({
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.18, green: 0.42, blue: 0.72 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10 },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    });
    formatRequests.push({
      autoResizeDimensions: {
        dimensions: { sheetId: sid, dimension: "COLUMNS", startIndex: 0, endIndex: s.headers.length },
      },
    });
    formatRequests.push({
      updateSheetProperties: {
        properties: { sheetId: sid, gridProperties: { frozenRowCount: 1 } },
        fields: "gridProperties.frozenRowCount",
      },
    });
  }
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: formatRequests } });

  return NextResponse.json({
    ok: true,
    message: `4タブ（予約・乗船名簿・出船前点検・乗務記録）のヘッダーを設定しました`,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  });
}

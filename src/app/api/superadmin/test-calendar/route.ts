/**
 * GET /api/superadmin/test-calendar?account_id=xxx
 * Google Calendar の接続テスト（superadmin 認証が必要）
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase";
import { resolveCredentials } from "@/lib/google-calendar";
import { google } from "googleapis";

async function checkAuth() {
  const store = await cookies();
  return store.get("superadmin_token")?.value === process.env.SUPERADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get("account_id");
  if (!accountId) return NextResponse.json({ error: "account_id が必要です" }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: account, error: accErr } = await supabase
    .from("accounts")
    .select("google_calendar_id, google_service_account_email, google_service_account_private_key")
    .eq("id", accountId)
    .maybeSingle();

  const result: Record<string, unknown> = {
    db_query_error: accErr?.message ?? null,
    db_calendar_id: account?.google_calendar_id ?? null,
    db_email: account?.google_service_account_email ?? null,
    db_key_length: account?.google_service_account_private_key?.length ?? 0,
    env_calendar_id: process.env.GOOGLE_CALENDAR_ID ?? null,
    env_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? null,
    env_key_length: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.length ?? 0,
  };

  const creds = resolveCredentials(account);
  result.creds_resolved = creds !== null;
  result.creds_calendar_id = creds?.calendarId ?? null;
  result.creds_email = creds?.email ?? null;
  result.creds_key_length = creds?.privateKey?.length ?? 0;

  if (!creds) {
    result.diagnosis = "認証情報が解決できません。DBまたはenv変数を確認してください。";
    return NextResponse.json(result);
  }

  // 実際にカレンダーAPIを叩いてみる
  try {
    const auth = new google.auth.JWT({
      email: creds.email,
      key: creds.privateKey,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.calendarList.get({ calendarId: creds.calendarId });
    result.calendar_name = res.data.summary;
    result.diagnosis = "✅ 接続成功";
  } catch (e) {
    result.api_error = e instanceof Error ? e.message : String(e);
    result.diagnosis = "❌ Google Calendar API エラー";
  }

  return NextResponse.json(result);
}

/**
 * GET  /api/debug/line?slug=testmaru          — LINE設定・船長ユーザー確認
 * POST /api/debug/line?slug=testmaru          — 船長全員にテストメッセージ送信
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase";
import { sendPushMessage } from "@/lib/line-messaging";

async function checkAuth() {
  const store = await cookies();
  return store.get("superadmin_token")?.value === process.env.SUPERADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "?slug= が必要です" }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("id, slug, name, line_channel_access_token")
    .eq("slug", slug)
    .maybeSingle();

  if (!account) return NextResponse.json({ error: `slug="${slug}" が見つかりません` }, { status: 404 });

  const { data: captains } = await supabase
    .from("users")
    .select("id, display_name, line_user_id, role, is_active")
    .eq("account_id", account.id)
    .in("role", ["captain", "staff", "admin", "operator"]);

  const token = account.line_channel_access_token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";

  // 各船長の line_user_id が Messaging API で有効か確認
  const captainChecks = await Promise.all(
    (captains ?? []).map(async (u) => {
      let profile_reachable: boolean | null = null;
      let profile_error: string | null = null;
      if (u.line_user_id && token) {
        try {
          const r = await fetch(`https://api.line.me/v2/bot/profile/${u.line_user_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          profile_reachable = r.ok;
          if (!r.ok) profile_error = `${r.status} ${await r.text()}`;
        } catch (e) {
          profile_reachable = false;
          profile_error = e instanceof Error ? e.message : String(e);
        }
      }
      return {
        display_name: u.display_name,
        role: u.role,
        is_active: u.is_active,
        has_line_user_id: !!u.line_user_id,
        line_user_id_preview: u.line_user_id ? `${u.line_user_id.slice(0, 6)}...` : null,
        profile_reachable,
        profile_error,
      };
    })
  );

  return NextResponse.json({
    account: {
      slug: account.slug,
      name: account.name,
      has_own_token: !!account.line_channel_access_token,
      token_preview: token ? `${token.slice(0, 6)}...${token.slice(-4)}` : null,
      using_fallback_env: !account.line_channel_access_token && !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
    },
    captains: captainChecks,
    captains_with_line_id: (captains ?? []).filter((u) => u.line_user_id && u.is_active).length,
  });
}

export async function POST(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "?slug= が必要です" }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("id, slug, name, line_channel_access_token")
    .eq("slug", slug)
    .maybeSingle();

  if (!account) return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });

  const token = account.line_channel_access_token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
  if (!token) return NextResponse.json({ error: "LINE Channel Access Token が未設定です" }, { status: 400 });

  const { data: captains } = await supabase
    .from("users")
    .select("display_name, line_user_id")
    .eq("account_id", account.id)
    .in("role", ["captain", "staff", "admin", "operator"])
    .eq("is_active", true);

  const targets = (captains ?? []).filter((u) => u.line_user_id);
  if (targets.length === 0) {
    return NextResponse.json({ error: "送信先の船長ユーザーが見つかりません（line_user_id が未設定）" }, { status: 400 });
  }

  const results: { name: string | null; ok: boolean; error?: string }[] = [];
  for (const c of targets) {
    try {
      await sendPushMessage(token, c.line_user_id!, [{ type: "text", text: `【${account.name}】LINE通知テストです` }]);
      results.push({ name: c.display_name, ok: true });
    } catch (e) {
      results.push({ name: c.display_name, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ results });
}

/**
 * 開発用ログインエンドポイント（本番では無効）
 * role を指定してモックセッションを発行する
 */

import { NextResponse } from "next/server";
import { saveSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { Role, SessionUser } from "@/types";

const VALID_ROLES: Role[] = ["customer", "captain", "staff", "operator", "admin"];
const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "開発環境専用です" }, { status: 403 });
  }

  const { role } = (await req.json()) as { role: Role };
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "無効な role です" }, { status: 400 });
  }

  const slug = process.env.ACCOUNT_SLUG ?? "demo";
  const supabase = createServerSupabaseClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!account) {
    return NextResponse.json({ error: `アカウント "${slug}" がDBに存在しません` }, { status: 500 });
  }

  // 開発用ユーザーを DB に upsert（FK 違反を防ぐ）
  await supabase.from("users").upsert(
    {
      id: DEV_USER_ID,
      account_id: account.id,
      line_user_id: "dev-line-user",
      display_name: `開発ユーザー（${role}）`,
      role,
      is_active: true,
    },
    { onConflict: "id" }
  );

  // customer ロールの場合は customers レコードも作成（予約に必要）
  if (role === "customer") {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", DEV_USER_ID)
      .maybeSingle();

    if (!existing) {
      await supabase.from("customers").insert({
        account_id: account.id,
        user_id: DEV_USER_ID,
        full_name: "開発テストユーザー",
      });
    }
  }

  const session: SessionUser = {
    userId: DEV_USER_ID,
    accountId: account.id,
    accountSlug: slug,
    lineUserId: "dev-line-user",
    displayName: `開発ユーザー（${role}）`,
    pictureUrl: null,
    role,
  };

  await saveSession(session);
  return NextResponse.json({ ok: true, role });
}

/**
 * デモ用ログイン（本番でも動作。DEMO_SECRET が一致した場合のみ許可）
 */

import { NextResponse } from "next/server";
import { saveSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { Role, SessionUser } from "@/types";

const VALID_ROLES: Role[] = ["customer", "captain"];
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000002";

export async function POST(req: Request) {
  const secret = process.env.DEMO_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "デモモードは無効です" }, { status: 403 });
  }

  const { password, role } = (await req.json()) as { password: string; role: Role };

  if (password !== secret) {
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "無効なロールです" }, { status: 400 });
  }

  const slug = process.env.ACCOUNT_SLUG ?? "demo";
  const supabase = createServerSupabaseClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!account) {
    return NextResponse.json({ error: `アカウント "${slug}" が存在しません` }, { status: 500 });
  }

  await supabase.from("users").upsert(
    {
      id: DEMO_USER_ID,
      account_id: account.id,
      line_user_id: "demo-line-user",
      display_name: role === "captain" ? "デモ船長" : "デモ客",
      role,
      is_active: true,
    },
    { onConflict: "id" }
  );

  if (role === "customer") {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", DEMO_USER_ID)
      .maybeSingle();

    if (!existing) {
      await supabase.from("customers").insert({
        account_id: account.id,
        user_id: DEMO_USER_ID,
        full_name: "デモユーザー",
      });
    }
  }

  const session: SessionUser = {
    userId: DEMO_USER_ID,
    accountId: account.id,
    accountSlug: slug,
    lineUserId: "demo-line-user",
    displayName: role === "captain" ? "デモ船長" : "デモ客",
    pictureUrl: null,
    role,
  };

  await saveSession(session);
  return NextResponse.json({ ok: true });
}

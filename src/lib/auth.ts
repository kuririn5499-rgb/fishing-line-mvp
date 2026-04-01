/**
 * 認証・セッション管理
 *
 * LINE idToken をサーバーで検証し、DB の users テーブルから
 * セッションユーザーを取得・自動作成する。
 * 画面分岐は DB の role を使う（LINE 公式アカウントの管理者権限は使わない）。
 */

import { cookies } from "next/headers";
import { createServerSupabaseClient } from "./supabase";
import { verifyLineIdToken } from "./line-verify";
import type { SessionUser, Role } from "@/types";

const SESSION_COOKIE = "fishing_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7日

// =====================
// セッション Cookie 管理
// =====================

/** セッション情報を Cookie に保存する */
export async function saveSession(session: SessionUser): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/** Cookie からセッション情報を取得する */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

/** セッション Cookie を削除する */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// =====================
// LINE ID トークン検証 → DB ユーザー取得・作成
// =====================

/**
 * LINE idToken を検証して DB のユーザーを返す。
 * 未登録なら customer として自動作成する。
 */
export async function loginWithLineToken(params: {
  idToken: string;
  accountSlug: string;
  liffId: string;
}): Promise<SessionUser> {
  const { idToken, accountSlug, liffId } = params;

  // 1. LINE サーバーでトークンを検証
  const lineProfile = await verifyLineIdToken(idToken, liffId);
  const lineUserId = lineProfile.sub;

  const supabase = createServerSupabaseClient();

  // 2. account_id を slug から取得
  const { data: account, error: accountErr } = await supabase
    .from("accounts")
    .select("id")
    .eq("slug", accountSlug)
    .single();

  if (accountErr || !account) {
    throw new Error(`アカウント "${accountSlug}" が見つかりません`);
  }
  const accountId = account.id;

  // 3. users テーブルから検索
  const { data: existingUser, error: userErr } = await supabase
    .from("users")
    .select("*")
    .eq("account_id", accountId)
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (userErr) throw new Error(`ユーザー検索エラー: ${userErr.message}`);

  let user = existingUser;

  // 4. 未登録なら customer として自動作成
  if (!user) {
    const { data: newUser, error: insertErr } = await supabase
      .from("users")
      .insert({
        account_id: accountId,
        line_user_id: lineUserId,
        display_name: lineProfile.name,
        picture_url: lineProfile.picture,
        role: "customer" satisfies Role,
        is_active: true,
      })
      .select()
      .single();

    if (insertErr || !newUser) {
      throw new Error(`ユーザー作成エラー: ${insertErr?.message}`);
    }
    user = newUser;

    // customers テーブルにも初期レコードを作成
    await supabase.from("customers").insert({
      account_id: accountId,
      user_id: newUser.id,
      full_name: lineProfile.name,
    });
  } else {
    // 表示名・アイコンを最新の LINE プロフィールで更新
    await supabase
      .from("users")
      .update({
        display_name: lineProfile.name,
        picture_url: lineProfile.picture,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  const session: SessionUser = {
    userId: user.id,
    accountId,
    lineUserId,
    displayName: user.display_name,
    pictureUrl: user.picture_url,
    role: user.role as Role,
  };

  // 5. セッションを Cookie に保存
  await saveSession(session);

  return session;
}

// =====================
// 権限チェックヘルパー
// =====================

/** 指定 role 以上の権限があるか（admin が最高権限） */
const ROLE_LEVEL: Record<Role, number> = {
  customer: 1,
  staff: 2,
  captain: 3,
  operator: 4,
  admin: 5,
};

export function hasRole(session: SessionUser, minRole: Role): boolean {
  return ROLE_LEVEL[session.role] >= ROLE_LEVEL[minRole];
}

/**
 * Server Component / Route Handler でセッションを取得し、
 * 権限が足りない場合は例外を投げる
 */
export async function requireSession(minRole?: Role): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (minRole && !hasRole(session, minRole)) throw new Error("FORBIDDEN");
  return session;
}

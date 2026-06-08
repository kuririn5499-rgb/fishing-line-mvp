/**
 * POST /api/auth
 * LINE idToken を検証して Cookie セッションを発行する
 *
 * リクエスト: { idToken: string; accountSlug: string }
 * レスポンス: { role: Role; userId: string; displayName: string | null }
 */

import { NextRequest, NextResponse } from "next/server";
import { loginWithLineToken } from "@/lib/auth";
import { AuthRequestSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    const mode = req.nextUrl.searchParams.get("mode");

    const parsed = AuthRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "バリデーションエラー" },
        { status: 400 }
      );
    }

    const { idToken, accountSlug, displayName, pictureUrl } = parsed.data;

    // JWT の aud クレームからチャンネル ID を取得してアカウントを逆引き
    // liff.init() に間違った liffId が渡された場合でも正しいアカウントを特定できる
    let resolvedSlug = accountSlug;
    let liffId = "";

    const supabase = createServerSupabaseClient();

    let acct: {
      id: string;
      slug: string;
      liff_id_captain: string | null;
      liff_id_customer: string | null;
    } | null = null;

    // トークンから channel ID を取得
    try {
      const payloadB64 = idToken.split(".")[1];
      const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
      const payload = JSON.parse(payloadJson) as { aud?: string | string[] };
      const aud = payload.aud;
      const channelId = Array.isArray(aud) ? aud[0] : aud;

      if (channelId) {
        const field = mode === "captain" ? "liff_id_captain" : "liff_id_customer";
        const { data } = await supabase
          .from("accounts")
          .select("id, slug, liff_id_captain, liff_id_customer")
          .like(field, `${channelId}-%`)
          .maybeSingle();
        acct = data;
        console.log("[api/auth] channel lookup:", channelId, "->", acct?.slug ?? "not found");
      }
    } catch {
      // JWT デコード失敗は無視してスラッグフォールバックへ
    }

    // チャンネル逆引きが失敗した場合はクライアント指定の accountSlug で検索
    if (!acct) {
      const { data } = await supabase
        .from("accounts")
        .select("id, slug, liff_id_captain, liff_id_customer")
        .eq("slug", accountSlug)
        .maybeSingle();
      acct = data;
      console.log("[api/auth] slug fallback:", accountSlug, "->", acct?.slug ?? "not found");
    }

    if (!acct) {
      return NextResponse.json(
        { error: `アカウント "${accountSlug}" が見つかりません` },
        { status: 404 }
      );
    }

    resolvedSlug = acct.slug;
    liffId =
      mode === "captain"
        ? (acct.liff_id_captain ?? process.env.NEXT_PUBLIC_LIFF_ID_CAPTAIN ?? "")
        : (acct.liff_id_customer ?? process.env.NEXT_PUBLIC_LIFF_ID_CUSTOMER ?? "");

    console.log("[api/auth] mode:", mode, "resolvedSlug:", resolvedSlug, "liffId:", liffId);

    if (!liffId) {
      return NextResponse.json(
        { error: "LIFF ID が設定されていません" },
        { status: 500 }
      );
    }

    const session = await loginWithLineToken({
      idToken,
      accountSlug: resolvedSlug,
      liffId,
      displayName,
      pictureUrl,
    });

    return NextResponse.json({
      role: session.role,
      userId: session.userId,
      displayName: session.displayName,
      accountSlug: resolvedSlug,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "認証エラー";
    console.error("[api/auth]", message);
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

/** セッションを破棄してログアウト */
export async function DELETE(): Promise<NextResponse> {
  const { clearSession } = await import("@/lib/auth");
  await clearSession();
  return NextResponse.json({ ok: true });
}

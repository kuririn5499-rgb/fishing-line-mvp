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

// LIFF ID を role ごとに決定するロジック
// 実際は accountSlug から DB の liff_id を引くのが望ましいが、
// MVP では env 変数を使う
function getLiffId(mode: string | null): string {
  if (mode === "captain") {
    return process.env.NEXT_PUBLIC_LIFF_ID_CAPTAIN ?? "";
  }
  return process.env.NEXT_PUBLIC_LIFF_ID_CUSTOMER ?? "";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    // クエリパラメータで LIFF モードを判定（customer / captain）
    const mode = req.nextUrl.searchParams.get("mode");

    const parsed = AuthRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "バリデーションエラー" },
        { status: 400 }
      );
    }

    const { idToken, accountSlug } = parsed.data;
    const liffId = getLiffId(mode);

    console.log("[api/auth] mode:", mode, "accountSlug:", accountSlug, "liffId:", liffId);

    if (!liffId) {
      return NextResponse.json(
        { error: "LIFF ID が設定されていません" },
        { status: 500 }
      );
    }

    const session = await loginWithLineToken({ idToken, accountSlug, liffId });

    return NextResponse.json({
      role: session.role,
      userId: session.userId,
      displayName: session.displayName,
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

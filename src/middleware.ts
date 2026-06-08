import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "fishing_session";

/**
 * ?a=slug が URL にある場合、セッションのアカウントと比較する。
 * 異なるアカウントならセッションを削除して同じ URL にリダイレクト。
 * ブラウザが実際に Set-Cookie でクッキーを削除してから再アクセスするため、
 * 次のリクエストで layout はセッションなしと判断して LiffGate を正しく起動できる。
 */
export function middleware(req: NextRequest) {
  const a = req.nextUrl.searchParams.get("a");
  if (!a) return NextResponse.next();

  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return NextResponse.next(); // セッションなし: そのまま

  try {
    const session = JSON.parse(raw) as { accountSlug?: string };
    // 同じアカウント: 不要なリダイレクトをしない
    if (session.accountSlug === a) return NextResponse.next();
  } catch {
    // パース失敗: セッションクリアして再認証
  }

  // 別アカウントのセッションが残っている → セッション削除 + 同 URL にリダイレクト
  // ブラウザがクッキーを削除してから再アクセス → セッションなし → LiffGate が正しく動く
  const res = NextResponse.redirect(req.url);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const config = {
  matcher: ["/captain", "/captain/:path+", "/customer", "/customer/:path+"],
};

import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "fishing_session";

/**
 * ?a=slug が URL にある場合、セッションのアカウントと一致しているか確認する。
 * 不一致なら（別のアカウントの LINE でアクセスした場合など）セッションを削除してリロード。
 * LiffGate が ?a= から正しい LIFF を使って再認証する。
 */
export function middleware(req: NextRequest) {
  const a = req.nextUrl.searchParams.get("a");
  if (!a) return NextResponse.next();

  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return NextResponse.next();

  try {
    const session = JSON.parse(raw) as { accountSlug?: string };
    // 同じアカウントならそのまま通す
    if (session.accountSlug === a) return NextResponse.next();
  } catch {
    // パース失敗 → 削除して再認証
  }

  // アカウント不一致 → セッションを削除してから同じ URL にリダイレクト
  // 次のリクエストでセッションなし → LiffGate が ?a= から正しいアカウントの LIFF で再認証
  const res = NextResponse.redirect(req.url);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const config = {
  matcher: ["/captain", "/captain/:path+", "/customer", "/customer/:path+"],
};

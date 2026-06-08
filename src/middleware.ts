import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "fishing_session";

/**
 * ?a=slug が URL にある場合、セッションクッキーをリクエストから除去する。
 * Next.js レイアウトは searchParams を受け取れないうえ、
 * サーバーコンポーネントからクッキーを削除もできないため、
 * ミドルウェアで処理してレイアウト到達前にセッションを無効化する。
 */
export function middleware(req: NextRequest) {
  const a = req.nextUrl.searchParams.get("a");
  if (!a) return NextResponse.next();

  // リクエストの Cookie ヘッダーからセッションを除去（layout が見る前に）
  const cookieHeader = req.headers.get("cookie") ?? "";
  const filtered = cookieHeader
    .split(";")
    .filter((c) => !c.trim().startsWith(`${SESSION_COOKIE}=`))
    .join(";");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("cookie", filtered);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  // ブラウザ側のセッションクッキーも削除
  res.cookies.delete(SESSION_COOKIE);

  return res;
}

export const config = {
  matcher: ["/captain", "/captain/:path+", "/customer", "/customer/:path+"],
};

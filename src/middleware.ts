import { NextRequest, NextResponse } from "next/server";

// ミドルウェアはリダイレクトや介入を一切行わない
// セッション管理はサーバーコンポーネント（layout.tsx）に委ねる
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/captain", "/captain/:path+", "/customer", "/customer/:path+"],
};

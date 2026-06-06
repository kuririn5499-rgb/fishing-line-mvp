import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE = "superadmin_token";
const MAX_AGE = 60 * 60 * 8; // 8時間

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!password || password !== process.env.SUPERADMIN_SECRET) {
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }
  const store = await cookies();
  store.set(COOKIE, process.env.SUPERADMIN_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(COOKIE);
  return NextResponse.json({ ok: true });
}

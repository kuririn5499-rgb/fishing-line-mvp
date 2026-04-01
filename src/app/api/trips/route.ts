/**
 * GET  /api/trips          便一覧（captain / admin 用）
 * POST /api/trips          便を作成する
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { TripCreateSchema } from "@/lib/schemas";
import { getTripsByAccount, createTrip, getTripsByDate } from "@/lib/repositories/trips";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const date = req.nextUrl.searchParams.get("date");

    const trips = date
      ? await getTripsByDate(session.accountId, date)
      : await getTripsByAccount(session.accountId);

    return NextResponse.json({ trips });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const body = await req.json();

    const parsed = TripCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const trip = await createTrip(session.accountId, session.userId, parsed.data);
    return NextResponse.json({ trip }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/**
 * GET  /api/duty-log   乗務記録取得
 * POST /api/duty-log   乗務記録を保存する
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { DutyLogSchema } from "@/lib/schemas";
import {
  upsertDutyLog,
  getDutyLogByTrip,
  updateDutyLogSheetRow,
} from "@/lib/repositories/duty-logs";
import { appendDutyLogToSheet } from "@/lib/google-sheets";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await requireSession("captain");
    const tripId = req.nextUrl.searchParams.get("trip_id");
    if (!tripId) {
      return NextResponse.json({ error: "trip_id は必須です" }, { status: 400 });
    }
    const log = await getDutyLogByTrip(tripId);
    return NextResponse.json({ log });
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

    const parsed = DutyLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const log = await upsertDutyLog(session.accountId, session.userId, parsed.data);

    // Google Sheets にミラー保存
    try {
      const supabase = createServerSupabaseClient();
      const { data: trip } = await supabase
        .from("trips")
        .select("trip_date, boats(name)")
        .eq("id", parsed.data.trip_id)
        .maybeSingle();

      if (trip) {
        const boatsData = trip.boats as unknown as { name: string } | { name: string }[] | null;
        const boatName = (Array.isArray(boatsData) ? boatsData[0]?.name : boatsData?.name) ?? "不明";
        const rowNumber = await appendDutyLogToSheet(
          log,
          trip.trip_date,
          boatName
        );
        if (rowNumber > 0) {
          await updateDutyLogSheetRow(log.id, rowNumber);
        }
      }
    } catch (sheetsErr) {
      console.error("[duty-log] Google Sheets 書き込みエラー:", sheetsErr);
    }

    return NextResponse.json({ log }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

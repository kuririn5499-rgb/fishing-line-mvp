/**
 * GET  /api/pre-departure   出船前検査取得
 * POST /api/pre-departure   出船前検査を保存する
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { PreDepartureCheckSchema } from "@/lib/schemas";
import {
  upsertPreDeparture,
  getPreDepartureByTrip,
  updatePreDepartureSheetRow,
} from "@/lib/repositories/pre-departure";
import { appendPreDepartureToSheet } from "@/lib/google-sheets";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await requireSession("captain");
    const tripId = req.nextUrl.searchParams.get("trip_id");
    if (!tripId) {
      return NextResponse.json({ error: "trip_id は必須です" }, { status: 400 });
    }
    const check = await getPreDepartureByTrip(tripId);
    return NextResponse.json({ check });
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

    const parsed = PreDepartureCheckSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const check = await upsertPreDeparture(
      session.accountId,
      session.userId,
      parsed.data
    );

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
        const rowNumber = await appendPreDepartureToSheet(
          check,
          trip.trip_date,
          boatName
        );
        if (rowNumber > 0) {
          await updatePreDepartureSheetRow(check.id, rowNumber);
        }
      }
    } catch (sheetsErr) {
      console.error("[pre-departure] Google Sheets 書き込みエラー:", sheetsErr);
    }

    return NextResponse.json({ check }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/**
 * GET  /api/manifests   乗船名簿取得
 * POST /api/manifests   乗船名簿を提出する（DB 保存 + Google Sheets ミラー）
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { ManifestSubmitSchema } from "@/lib/schemas";
import {
  upsertManifest,
  getManifestByReservation,
  updateManifestSheetRow,
} from "@/lib/repositories/manifests";
import { appendManifestToSheet } from "@/lib/google-sheets";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const reservationId = req.nextUrl.searchParams.get("reservation_id");
    if (!reservationId) {
      return NextResponse.json({ error: "reservation_id は必須です" }, { status: 400 });
    }

    const manifest = await getManifestByReservation(reservationId);
    return NextResponse.json({ manifest });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession("customer");
    const body = await req.json();

    const parsed = ManifestSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // customer_id を取得
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();

    // 予約コードと便日付を取得（Sheets 書き込み用）
    const { data: reservation } = await supabase
      .from("reservations")
      .select("reservation_code, trips(trip_date)")
      .eq("id", parsed.data.reservation_id)
      .maybeSingle();

    const manifest = await upsertManifest(
      session.accountId,
      customer?.id ?? null,
      session.userId,
      parsed.data
    );

    // Google Sheets にミラー保存（失敗してもエラーを返さない）
    if (reservation) {
      try {
        const tripDate =
          (reservation.trips as { trip_date: string } | null)?.trip_date ?? "";
        const rowNumber = await appendManifestToSheet(
          manifest,
          reservation.reservation_code,
          tripDate
        );
        if (rowNumber > 0) {
          await updateManifestSheetRow(manifest.id, rowNumber);
        }
      } catch (sheetsErr) {
        console.error("[manifests] Google Sheets 書き込みエラー:", sheetsErr);
      }
    }

    return NextResponse.json({ manifest }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

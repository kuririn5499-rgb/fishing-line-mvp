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
import { appendManifestToSheet, resolveSheetsCreds } from "@/lib/google-sheets";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const reservationId = req.nextUrl.searchParams.get("reservation_id");
    if (!reservationId) {
      return NextResponse.json({ error: "reservation_id は必須です" }, { status: 400 });
    }

    // 予約が自アカウントに属することを確認
    const supabase = createServerSupabaseClient();
    const { data: resCheck } = await supabase
      .from("reservations")
      .select("id")
      .eq("id", reservationId)
      .eq("account_id", session.accountId)
      .maybeSingle();
    if (!resCheck) {
      return NextResponse.json({ manifest: null });
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

    // 予約コードと便日付を取得（所有権確認 + Sheets 書き込み用）
    const { data: reservation } = await supabase
      .from("reservations")
      .select("reservation_code, trips(trip_date)")
      .eq("id", parsed.data.reservation_id)
      .eq("account_id", session.accountId)
      .maybeSingle();

    if (!reservation) {
      return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
    }

    const manifest = await upsertManifest(
      session.accountId,
      customer?.id ?? null,
      session.userId,
      parsed.data
    );

    // Google Sheets にミラー保存（失敗してもエラーを返さない）
    if (reservation) {
      try {
        const tripsData = reservation.trips as unknown as { trip_date: string } | { trip_date: string }[] | null;
        const tripDate = (Array.isArray(tripsData) ? tripsData[0]?.trip_date : tripsData?.trip_date) ?? "";

        const { data: acct } = await supabase
          .from("accounts")
          .select("google_spreadsheet_id, google_service_account_email, google_service_account_private_key")
          .eq("id", session.accountId)
          .maybeSingle();

        const sheetsCreds = resolveSheetsCreds(acct);
        if (sheetsCreds) {
          const rowNumber = await appendManifestToSheet(
            manifest,
            reservation.reservation_code,
            tripDate,
            sheetsCreds
          );
          if (rowNumber > 0) {
            await updateManifestSheetRow(manifest.id, rowNumber);
          }
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

/**
 * POST /api/captain/manifests
 * 船長がお客さんの代わりに乗船名簿を直接入力・提出する
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { ManifestSubmitSchema } from "@/lib/schemas";
import { upsertManifest, updateManifestSheetRow } from "@/lib/repositories/manifests";
import { createServerSupabaseClient } from "@/lib/supabase";
import { appendManifestToSheet, resolveSheetsCreds } from "@/lib/google-sheets";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const body = await req.json();

    const parsed = ManifestSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 予約からcustomer_id取得（自アカウントのものか確認）
    const { data: reservation } = await supabase
      .from("reservations")
      .select("customer_id, reservation_code, trips(trip_date)")
      .eq("id", parsed.data.reservation_id)
      .eq("account_id", session.accountId)
      .maybeSingle();

    if (!reservation) {
      return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
    }

    const manifest = await upsertManifest(
      session.accountId,
      reservation.customer_id ?? null,
      session.userId,
      parsed.data
    );

    // Google Sheets 同期
    try {
      const { data: acct } = await supabase
        .from("accounts")
        .select("google_spreadsheet_id, google_service_account_email, google_service_account_private_key")
        .eq("id", session.accountId)
        .maybeSingle();

      const sheetsCreds = resolveSheetsCreds(acct);
      if (sheetsCreds && reservation) {
        const tripsData = reservation.trips as unknown as { trip_date: string } | { trip_date: string }[] | null;
        const tripDate = (Array.isArray(tripsData) ? tripsData[0]?.trip_date : tripsData?.trip_date) ?? "";
        const rowNumber = await appendManifestToSheet(
          manifest,
          reservation.reservation_code,
          tripDate,
          sheetsCreds
        );
        if (rowNumber > 0) await updateManifestSheetRow(manifest.id, rowNumber);
      }
    } catch (sheetsErr) {
      console.error("[captain/manifests] Sheets同期エラー:", sheetsErr);
    }

    return NextResponse.json({ manifest }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

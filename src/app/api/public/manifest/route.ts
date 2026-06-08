/**
 * POST /api/public/manifest
 * 認証不要。ビジター（QRコード経由）が乗船名簿を提出する。
 * 予約レコードを作成し、名簿を紐付けて保存する。
 */

import { NextRequest, NextResponse } from "next/server";
import { VisitorManifestSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase";
import { nanoid } from "@/lib/repositories/utils";
import { appendManifestToSheet, resolveSheetsCreds } from "@/lib/google-sheets";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const parsed = VisitorManifestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const supabase = createServerSupabaseClient();

    // アカウント存在確認
    const { data: account } = await supabase
      .from("accounts")
      .select("id, google_spreadsheet_id, google_service_account_email, google_service_account_private_key")
      .eq("id", input.account_id)
      .maybeSingle();
    if (!account) {
      return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
    }

    // 便の存在確認
    const { data: trip } = await supabase
      .from("trips")
      .select("id, trip_date, status")
      .eq("id", input.trip_id)
      .eq("account_id", input.account_id)
      .maybeSingle();
    if (!trip || trip.status === "cancelled") {
      return NextResponse.json({ error: "便が見つかりません" }, { status: 404 });
    }

    // 予約コード生成（重複回避）
    let code = nanoid(8);
    for (let i = 0; i < 5; i++) {
      const { data: exists } = await supabase
        .from("reservations")
        .select("id")
        .eq("reservation_code", code)
        .maybeSingle();
      if (!exists) break;
      code = nanoid(8);
    }

    // 予約作成
    const { data: reservation, error: resErr } = await supabase
      .from("reservations")
      .insert({
        account_id: input.account_id,
        trip_id: input.trip_id,
        customer_id: null,
        reservation_code: code,
        passengers_count: input.passengers_count,
        status: "confirmed",
        memo: "QRコード経由（現地記入）",
      })
      .select("id, reservation_code")
      .single();
    if (resErr || !reservation) {
      console.error("[public/manifest] 予約作成エラー:", resErr?.message);
      return NextResponse.json({ error: `予約の作成に失敗しました: ${resErr?.message ?? "不明"}` }, { status: 500 });
    }

    // 名簿作成（submitted_by_user_id は nullable）
    const now = new Date().toISOString();
    const { data: manifest, error: manErr } = await supabase
      .from("boarding_manifests")
      .insert({
        account_id: input.account_id,
        reservation_id: reservation.id,
        customer_id: null,
        submitted_by_user_id: null,
        full_name: input.full_name,
        age: input.age ?? null,
        phone: input.phone,
        address: input.address,
        emergency_name: input.emergency_name ?? null,
        emergency_phone: input.emergency_phone,
        life_jacket_owned: false,
        rental_required: false,
        companions_json: input.companions ?? [],
        notes: input.notes ?? null,
        submitted_at: now,
        updated_at: now,
      })
      .select()
      .single();
    if (manErr || !manifest) {
      console.error("[public/manifest] 名簿作成エラー:", manErr?.message);
      return NextResponse.json({ error: `名簿の保存に失敗しました: ${manErr?.message ?? "不明"}` }, { status: 500 });
    }

    // Google Sheets（失敗してもエラーを返さない）
    try {
      const sheetsCreds = resolveSheetsCreds(account);
      if (sheetsCreds) {
        const rowNumber = await appendManifestToSheet(manifest, code, trip.trip_date, sheetsCreds);
        if (rowNumber > 0) {
          await supabase
            .from("boarding_manifests")
            .update({ sheet_row_number: rowNumber })
            .eq("id", manifest.id);
        }
      }
    } catch (sheetsErr) {
      console.error("[public/manifest] Google Sheets エラー:", sheetsErr);
    }

    return NextResponse.json({ reservation_code: code, manifest_id: manifest.id }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラーが発生しました";
    console.error("[public/manifest] 予期せぬエラー:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

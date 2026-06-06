/**
 * POST /api/captain/reservations
 * 船長が電話受付などで手動入力する予約作成エンドポイント。
 * customer テーブルを電話番号で検索→なければ新規作成してから予約を作る。
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { CaptainReservationCreateSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase";
import { nanoid } from "@/lib/repositories/utils";
import { appendReservationToSheet } from "@/lib/google-sheets";
import { syncTripCalendarCounts } from "@/lib/calendar-sync";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const body = await req.json();

    const parsed = CaptainReservationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { trip_id, customer_name, customer_phone, passengers_count, memo, status } = parsed.data;
    const supabase = createServerSupabaseClient();

    // 便の存在確認
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("id, trip_date, status")
      .eq("id", trip_id)
      .eq("account_id", session.accountId)
      .maybeSingle();

    if (tripErr || !trip) {
      return NextResponse.json({ error: "便が見つかりません" }, { status: 404 });
    }

    // 電話番号で既存顧客を検索、なければ新規作成
    let customerId: string;

    const phoneToSearch = customer_phone || null;
    const existing = phoneToSearch
      ? await supabase
          .from("customers")
          .select("id")
          .eq("account_id", session.accountId)
          .eq("phone", phoneToSearch)
          .maybeSingle()
      : { data: null };

    if (existing.data) {
      customerId = existing.data.id;
      // 名前が未設定なら更新
      await supabase
        .from("customers")
        .update({ full_name: customer_name, updated_at: new Date().toISOString() })
        .eq("id", customerId)
        .is("full_name", null);
    } else {
      const { data: newCustomer, error: custErr } = await supabase
        .from("customers")
        .insert({
          account_id: session.accountId,
          full_name: customer_name,
          phone: phoneToSearch,
        })
        .select("id")
        .single();

      if (custErr || !newCustomer) {
        throw new Error(`顧客作成エラー: ${custErr?.message}`);
      }
      customerId = newCustomer.id;
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
        account_id: session.accountId,
        trip_id,
        customer_id: customerId,
        reservation_code: code,
        passengers_count,
        memo: memo ?? null,
        status,
      })
      .select()
      .single();

    if (resErr || !reservation) {
      throw new Error(`予約作成エラー: ${resErr?.message}`);
    }

    // Google Sheets 同期
    try {
      await appendReservationToSheet(
        trip.trip_date,
        reservation.reservation_code,
        trip_id,
        customer_name,
        passengers_count,
        status,
        memo ?? null,
        reservation.created_at
      );
    } catch (sheetsErr) {
      console.error("[captain/reservations] Sheets同期エラー:", sheetsErr);
    }

    // カレンダー同期（エラーは warning として返す）
    let calendarWarning: string | undefined;
    try {
      await syncTripCalendarCounts(trip_id, supabase, session.accountId);
    } catch (calErr) {
      calendarWarning = calErr instanceof Error ? calErr.message : "カレンダー同期失敗";
      console.error("[captain/reservations] カレンダー同期エラー:", calErr);
    }

    return NextResponse.json(
      { reservation, customer_id: customerId, calendarWarning },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

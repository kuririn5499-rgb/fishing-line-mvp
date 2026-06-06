/**
 * GET  /api/reservations   予約一覧
 * POST /api/reservations   予約を作成する
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { ReservationCreateSchema } from "@/lib/schemas";
import {
  getReservationsByTrip,
  getReservationsByCustomer,
  createReservation,
} from "@/lib/repositories/reservations";
import { createServerSupabaseClient } from "@/lib/supabase";
import { appendReservationToSheet } from "@/lib/google-sheets";
import { syncTripCalendarCounts } from "@/lib/calendar-sync";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const tripId = req.nextUrl.searchParams.get("trip_id");

    if (tripId && session.role !== "customer") {
      // captain / admin は便単位で取得
      const reservations = await getReservationsByTrip(tripId, session.accountId);
      return NextResponse.json({ reservations });
    }

    // customer は自分の予約を取得
    const supabase = createServerSupabaseClient();
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ reservations: [] });
    }

    const reservations = await getReservationsByCustomer(
      customer.id,
      session.accountId
    );
    return NextResponse.json({ reservations });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession("customer");
    const body = await req.json();

    const parsed = ReservationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: "顧客情報が見つかりません" }, { status: 404 });
    }

    // 入力された本名で顧客レコードを更新
    if (parsed.data.customer_name) {
      await supabase
        .from("customers")
        .update({ full_name: parsed.data.customer_name, updated_at: new Date().toISOString() })
        .eq("id", customer.id);
    }

    // クーポン検証・割引額計算
    let couponId: string | undefined;
    let discountAmount: number | undefined;

    if (parsed.data.coupon_id) {
      const { data: userCoupon } = await supabase
        .from("user_coupons")
        .select("id, status, coupons(discount_type, discount_value)")
        .eq("id", parsed.data.coupon_id)
        .eq("user_id", session.userId)
        .eq("status", "issued")
        .maybeSingle();

      if (userCoupon) {
        const couponData = userCoupon.coupons as unknown as {
          discount_type: string | null;
          discount_value: number | null;
        } | null;

        if (couponData?.discount_type === "amount" && couponData.discount_value) {
          couponId = parsed.data.coupon_id;
          discountAmount = couponData.discount_value * parsed.data.passengers_count;
        }
      }
    }

    const reservation = await createReservation(session.accountId, customer.id, {
      ...parsed.data,
      coupon_id: couponId,
      discount_amount: discountAmount,
    });

    // クーポンを使用済みにする
    if (couponId) {
      await supabase
        .from("user_coupons")
        .update({ status: "used", used_at: new Date().toISOString() })
        .eq("id", couponId);
    }

    // Google Sheets & カレンダーに予約を同期
    try {
      const supabase = createServerSupabaseClient();
      const { data: trip } = await supabase
        .from("trips")
        .select("trip_date, departure_time, return_time, target_species, capacity, gcal_event_id")
        .eq("id", parsed.data.trip_id)
        .maybeSingle();

      const { data: cust } = await supabase
        .from("customers")
        .select("full_name")
        .eq("id", customer.id)
        .maybeSingle();

      if (trip) {
        // Sheets 同期
        await appendReservationToSheet(
          trip.trip_date,
          reservation.reservation_code,
          parsed.data.trip_id,
          cust?.full_name ?? session.displayName ?? "",
          parsed.data.passengers_count,
          reservation.status,
          parsed.data.memo ?? null,
          reservation.created_at
        );

        // カレンダー更新（gcal_event_id がなければ新規作成も行う）
        await syncTripCalendarCounts(parsed.data.trip_id, supabase, session.accountId);
      }
    } catch (syncErr) {
      console.error("[reservations] 同期エラー:", syncErr);
    }

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

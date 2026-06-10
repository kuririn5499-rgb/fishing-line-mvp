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
import { appendReservationToSheet, resolveSheetsCreds } from "@/lib/google-sheets";
import { syncTripCalendarCounts } from "@/lib/calendar-sync";
import { sendPushMessage, buildNewReservationMessage } from "@/lib/line-messaging";

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

    // 定員チェック
    const { data: tripForCapacity } = await supabase
      .from("trips")
      .select("capacity")
      .eq("id", parsed.data.trip_id)
      .eq("account_id", session.accountId)
      .maybeSingle();

    if (!tripForCapacity) {
      return NextResponse.json({ error: "便が見つかりません" }, { status: 404 });
    }

    const isWaitlist = parsed.data.waitlist === true;

    if (tripForCapacity.capacity !== null && tripForCapacity.capacity > 0) {
      const { data: currentReservations } = await supabase
        .from("reservations")
        .select("passengers_count, status")
        .eq("trip_id", parsed.data.trip_id)
        .not("status", "in", '("cancelled","waitlist")');

      const currentTotal = (currentReservations ?? []).reduce(
        (sum, r) => sum + (r.passengers_count ?? 0),
        0
      );
      const remaining = tripForCapacity.capacity - currentTotal;

      if (isWaitlist) {
        // キャンセル待ち：満員のときのみ登録可能
        if (remaining > 0) {
          return NextResponse.json(
            { error: "この便はまだ空席があります。通常の予約をご利用ください。" },
            { status: 400 }
          );
        }
      } else {
        // 通常予約：空席チェック
        if (currentTotal + parsed.data.passengers_count > tripForCapacity.capacity) {
          const msg =
            remaining <= 0
              ? "この便は満員です。キャンセル待ちをご利用ください。"
              : `残り定員は${remaining}名です。${parsed.data.passengers_count}名での予約はできません。`;
          return NextResponse.json({ error: msg }, { status: 400 });
        }
      }
    } else if (isWaitlist) {
      return NextResponse.json(
        { error: "この便はキャンセル待ち対象外です。" },
        { status: 400 }
      );
    }

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: "顧客情報が見つかりません" }, { status: 404 });
    }

    // 本名・電話番号で顧客レコードを更新
    await supabase
      .from("customers")
      .update({
        ...(parsed.data.customer_name ? { full_name: parsed.data.customer_name } : {}),
        ...(parsed.data.customer_phone ? { phone: parsed.data.customer_phone } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", customer.id);

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
      coupon_id: isWaitlist ? undefined : couponId,
      discount_amount: isWaitlist ? undefined : discountAmount,
      status: isWaitlist ? "waitlist" : "pending",
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
      const [{ data: trip }, { data: cust }, { data: acct }] = await Promise.all([
        supabase
          .from("trips")
          .select("trip_date, departure_time, return_time, target_species, capacity, gcal_event_id")
          .eq("id", parsed.data.trip_id)
          .maybeSingle(),
        supabase.from("customers").select("full_name").eq("id", customer.id).maybeSingle(),
        supabase
          .from("accounts")
          .select("google_spreadsheet_id, google_service_account_email, google_service_account_private_key")
          .eq("id", session.accountId)
          .maybeSingle(),
      ]);

      if (trip) {
        const sheetsCreds = resolveSheetsCreds(acct);
        if (sheetsCreds) {
          await appendReservationToSheet(
            trip.trip_date,
            reservation.reservation_code,
            parsed.data.trip_id,
            cust?.full_name ?? session.displayName ?? "",
            parsed.data.customer_phone ?? "",
            parsed.data.passengers_count,
            reservation.status,
            parsed.data.memo ?? null,
            reservation.created_at,
            sheetsCreds
          );
        }

        // カレンダー更新（gcal_event_id がなければ新規作成も行う）
        await syncTripCalendarCounts(parsed.data.trip_id, supabase, session.accountId);
      }
    } catch (syncErr) {
      console.error("[reservations] 同期エラー:", syncErr);
    }

    // 船長・スタッフに LINE 通知（失敗しても続行）
    try {
      const supabase2 = createServerSupabaseClient();
      const [{ data: account }, { data: captains }, { data: tripForNotify }, { data: custForNotify }] = await Promise.all([
        supabase2.from("accounts").select("line_channel_access_token").eq("id", session.accountId).maybeSingle(),
        supabase2.from("users").select("line_user_id").eq("account_id", session.accountId).in("role", ["captain", "staff", "admin", "operator"]).eq("is_active", true),
        supabase2.from("trips").select("trip_date, target_species").eq("id", parsed.data.trip_id).maybeSingle(),
        supabase2.from("customers").select("full_name").eq("user_id", session.userId).maybeSingle(),
      ]);
      const token = account?.line_channel_access_token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
      const { data: nf1 } = await supabase2.from("accounts").select("notify_line_new_reservation").eq("id", session.accountId).maybeSingle();
      const notifyEnabled = (nf1 as { notify_line_new_reservation?: boolean } | null)?.notify_line_new_reservation !== false;
      if (token && tripForNotify && notifyEnabled) {
        const messages = buildNewReservationMessage({
          customerName: custForNotify?.full_name ?? session.displayName ?? null,
          tripDate: tripForNotify.trip_date,
          targetSpecies: tripForNotify.target_species ?? null,
          passengersCount: parsed.data.passengers_count,
          reservationCode: reservation.reservation_code,
          isWaitlist: isWaitlist,
        });
        for (const captain of captains ?? []) {
          if (captain.line_user_id) {
            await sendPushMessage(token, captain.line_user_id, messages);
          }
        }
      }
    } catch (notifyErr) {
      console.error("[reservations] 船長通知失敗:", notifyErr);
    }

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

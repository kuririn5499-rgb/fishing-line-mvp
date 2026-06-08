/**
 * PATCH /api/reservations/:id
 * - captain/staff/admin: 任意の予約ステータスを変更可能
 * - customer: 自分の予約のみ cancelled に変更可能
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { syncTripCalendarCounts } from "@/lib/calendar-sync";
import { processWaitlist } from "@/lib/waitlist";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const { id: reservationId } = await params;
    const { status, restore_coupon } = await req.json();

    const isCaptain = ["captain", "staff", "admin", "operator"].includes(session.role);
    const isCustomer = session.role === "customer";

    // customer はキャンセルのみ
    if (isCustomer && status !== "cancelled") {
      return NextResponse.json({ error: "キャンセルのみ操作できます" }, { status: 403 });
    }
    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "無効なステータスです" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 予約取得
    const { data: reservation } = await supabase
      .from("reservations")
      .select("id, trip_id, account_id, customer_id, status, coupon_id")
      .eq("id", reservationId)
      .eq("account_id", session.accountId)
      .maybeSingle();

    if (!reservation) {
      return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
    }

    // customer は自分の予約のみ操作可能
    if (isCustomer) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", session.userId)
        .maybeSingle();

      if (!customer || reservation.customer_id !== customer.id) {
        return NextResponse.json({ error: "この予約を操作する権限がありません" }, { status: 403 });
      }
      // 完了済みはキャンセル不可
      if (reservation.status === "completed") {
        return NextResponse.json({ error: "完了済みの予約はキャンセルできません" }, { status: 400 });
      }
    }

    const { error } = await supabase
      .from("reservations")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", reservationId);

    if (error) throw new Error(`予約更新エラー: ${error.message}`);

    // 船長操作でキャンセル かつ restore_coupon=true の場合はクーポンを戻す
    if (status === "cancelled" && isCaptain && restore_coupon && reservation.coupon_id) {
      await supabase
        .from("user_coupons")
        .update({ status: "issued", used_at: null })
        .eq("id", reservation.coupon_id);
    }

    // キャンセルになった場合はキャンセル待ちを繰り上げる
    if (status === "cancelled") {
      await processWaitlist(reservation.trip_id).catch((e) =>
        console.error("[reservations/PATCH] waitlist処理失敗:", e)
      );
    }

    // カレンダー人数を再同期
    let calWarning: string | undefined;
    try {
      await syncTripCalendarCounts(reservation.trip_id, supabase, session.accountId);
    } catch (calErr) {
      calWarning = calErr instanceof Error ? calErr.message : "カレンダー同期失敗";
      console.error("[reservations/PATCH] カレンダー同期失敗:", calErr);
    }

    return NextResponse.json({ ok: true, ...(calWarning ? { cal_warning: calWarning } : {}) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/**
 * DELETE /api/reservations/:id
 * キャンセル済みの予約を完全削除する（captain 以上のみ）
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const { id: reservationId } = await params;
    const supabase = createServerSupabaseClient();

    const { data: reservation } = await supabase
      .from("reservations")
      .select("id, status, account_id")
      .eq("id", reservationId)
      .eq("account_id", session.accountId)
      .maybeSingle();

    if (!reservation) {
      return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
    }
    if (reservation.status !== "cancelled") {
      return NextResponse.json({ error: "キャンセル済みの予約のみ削除できます" }, { status: 400 });
    }

    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", reservationId);

    if (error) throw new Error(`削除エラー: ${error.message}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

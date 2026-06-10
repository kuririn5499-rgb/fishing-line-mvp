/**
 * POST /api/reservations/:id/cancel
 * 顧客が自分の予約をキャンセルする
 * feature_customer_cancel が有効なアカウントのみ利用可
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { sendPushMessage, buildCancellationNoticeMessage } from "@/lib/line-messaging";
import { todayJST } from "@/lib/repositories/utils";
import { processWaitlist } from "@/lib/waitlist";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await requireSession("customer");
    const { id: reservationId } = await params;
    const supabase = createServerSupabaseClient();

    // アカウントの機能フラグを確認
    const { data: account } = await supabase
      .from("accounts")
      .select("name, boat_name, line_channel_access_token, feature_customer_cancel")
      .eq("id", session.accountId)
      .maybeSingle();

    if (!account?.feature_customer_cancel) {
      return NextResponse.json({ error: "キャンセル機能は無効です" }, { status: 403 });
    }

    // 自分の customer レコードを取得
    const { data: customer } = await supabase
      .from("customers")
      .select("id, full_name")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: "顧客情報が見つかりません" }, { status: 404 });
    }

    // 予約を取得（自分の予約のみ）
    const { data: reservation } = await supabase
      .from("reservations")
      .select("id, status, passengers_count, trips(id, trip_date, target_species, status)")
      .eq("id", reservationId)
      .eq("account_id", session.accountId)
      .eq("customer_id", customer.id)
      .maybeSingle();

    if (!reservation) {
      return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
    }

    if (reservation.status === "cancelled") {
      return NextResponse.json({ error: "すでにキャンセル済みです" }, { status: 400 });
    }

    const trip = Array.isArray(reservation.trips) ? reservation.trips[0] : reservation.trips;
    const today = todayJST();

    if (!trip || trip.trip_date < today) {
      return NextResponse.json({ error: "過去の便はキャンセルできません" }, { status: 400 });
    }

    // キャンセル実行
    await supabase
      .from("reservations")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", reservationId);

    // 船長への LINE 通知（失敗しても続行）
    try {
      const token = account.line_channel_access_token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
      const { data: nfCancel } = await supabase.from("accounts").select("notify_line_cancellation").eq("id", session.accountId).maybeSingle();
      if (token && (nfCancel as { notify_line_cancellation?: boolean } | null)?.notify_line_cancellation !== false) {
        const { data: captainUsers } = await supabase
          .from("users")
          .select("line_user_id")
          .eq("account_id", session.accountId)
          .in("role", ["captain", "admin", "operator"])
          .not("line_user_id", "is", null);

        const boatName = account.boat_name ?? account.name ?? "船";
        const messages = buildCancellationNoticeMessage({
          boatName,
          tripDate: trip.trip_date,
          targetSpecies: trip.target_species as string | null,
          customerName: customer.full_name,
          passengersCount: reservation.passengers_count,
        });

        for (const u of captainUsers ?? []) {
          if (u.line_user_id) {
            await sendPushMessage(token, u.line_user_id, messages).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error("[reservations/cancel] LINE通知失敗:", e);
    }

    // キャンセル待ちを繰り上げる（失敗しても続行）
    await processWaitlist(trip.id).catch((e) =>
      console.error("[reservations/cancel] waitlist処理失敗:", e)
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

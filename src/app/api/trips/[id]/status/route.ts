/**
 * PATCH /api/trips/:id/status
 * 便のステータスを更新する（captain / admin のみ）
 * - → cancelled: 全予約を一括キャンセル + カレンダーイベントを削除
 * - cancelled/completed → open: カレンダーイベントを再作成
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { TripStatusUpdateSchema } from "@/lib/schemas";
import { updateTripStatus, getTripById, setTripGcalEventId } from "@/lib/repositories/trips";
import { createTripEvent, createClosedDayEvent, deleteTripEvent, resolveCredentials } from "@/lib/google-calendar";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const { id } = await params;

    const body = await req.json();
    const parsed = TripStatusUpdateSchema.safeParse({ ...body, trip_id: id });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const newStatus = parsed.data.status;
    const trip = await getTripById(id, session.accountId);
    if (!trip) {
      return NextResponse.json({ error: "便が見つかりません" }, { status: 404 });
    }

    await updateTripStatus(id, session.accountId, newStatus);

    const supabase = createServerSupabaseClient();
    let calWarning: string | undefined;

    // アカウントの Google Calendar 認証情報を取得
    const { data: account } = await supabase
      .from("accounts")
      .select("google_calendar_id, google_service_account_email, google_service_account_private_key")
      .eq("id", session.accountId)
      .maybeSingle();
    const creds = resolveCredentials(account);

    if (newStatus === "cancelled" || newStatus === "closed") {
      // 予約を一括キャンセル
      await supabase
        .from("reservations")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("trip_id", id)
        .eq("account_id", session.accountId)
        .in("status", ["pending", "confirmed", "waitlist"]);

      // 既存カレンダーイベントを削除
      if (trip.gcal_event_id && creds) {
        try {
          await deleteTripEvent(trip.gcal_event_id, creds);
        } catch (delErr) {
          calWarning = delErr instanceof Error ? delErr.message : "カレンダー削除失敗";
          console.error("[trips/status] カレンダー削除失敗:", delErr);
        }
        await setTripGcalEventId(id, "").catch((e) =>
          console.error("[trips/status] gcal_event_id クリア失敗:", e)
        );
      }

      // 休船の場合は終日イベントを新規作成
      if (newStatus === "closed" && creds) {
        try {
          const gcalEventId = await createClosedDayEvent(id, trip.trip_date, creds);
          await setTripGcalEventId(id, gcalEventId);
        } catch (calErr) {
          calWarning = calErr instanceof Error ? calErr.message : "カレンダー休船登録失敗";
          console.error("[trips/status] カレンダー休船登録失敗:", calErr);
        }
      }
    } else if (
      (trip.status === "cancelled" || trip.status === "completed" || trip.status === "closed") &&
      newStatus === "open"
    ) {
      // 既存イベント（休船終日イベント含む）を削除
      if (trip.gcal_event_id && creds) {
        try {
          await deleteTripEvent(trip.gcal_event_id, creds);
        } catch (delErr) {
          console.error("[trips/status] カレンダー削除失敗:", delErr);
        }
        await setTripGcalEventId(id, "").catch((e) =>
          console.error("[trips/status] gcal_event_id クリア失敗:", e)
        );
      }

      // 出発・帰港時間があれば通常イベントを再作成
      if (trip.departure_time && trip.return_time && creds) {
        try {
          const { count: reservedCount } = await supabase
            .from("reservations")
            .select("id", { count: "exact", head: true })
            .eq("trip_id", id)
            .neq("status", "cancelled");

          const tripAny = trip as unknown as Record<string, unknown>;
          const gcalEventId = await createTripEvent({
            tripId: trip.id,
            tripDate: trip.trip_date,
            departureTime: trip.departure_time.slice(0, 5),
            returnTime: trip.return_time.slice(0, 5),
            targetSpecies: trip.target_species ?? undefined,
            fishingMethod: (tripAny.fishing_method as string | null) ?? undefined,
            location: (tripAny.location as string | null) ?? undefined,
            capacity: trip.capacity ?? undefined,
            reservedCount: reservedCount ?? 0,
          }, creds);
          await setTripGcalEventId(id, gcalEventId);
        } catch (calErr) {
          calWarning = calErr instanceof Error ? calErr.message : "カレンダー再作成失敗";
          console.error("[trips/status] カレンダー再作成失敗:", calErr);
        }
      }
    }

    return NextResponse.json({ ok: true, ...(calWarning ? { cal_warning: calWarning } : {}) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/**
 * カレンダー同期ヘルパー
 * 便の gcal_event_id の有無に関わらず、予約人数をカレンダーに反映する。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { updateTripEventCounts } from "./google-calendar";

export async function syncTripCalendarCounts(
  tripId: string,
  supabase: SupabaseClient,
  accountId: string
): Promise<void> {
  const { data: trip } = await supabase
    .from("trips")
    .select("trip_date, departure_time, return_time, target_species, capacity, gcal_event_id")
    .eq("id", tripId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (!trip?.departure_time || !trip.return_time) return;

  const { count: reservedCount } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", tripId)
    .neq("status", "cancelled");

  const eventInput = {
    tripId,
    tripDate: trip.trip_date,
    departureTime: trip.departure_time.slice(0, 5),
    returnTime: trip.return_time.slice(0, 5),
    targetSpecies: trip.target_species ?? undefined,
    capacity: trip.capacity ?? undefined,
    reservedCount: reservedCount ?? 0,
  };

  if (trip.gcal_event_id) {
    // 既存イベントの予約人数を更新する（イベント作成は船長の便登録のみ）
    await updateTripEventCounts(trip.gcal_event_id, eventInput);
  }
}

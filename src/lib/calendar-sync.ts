/**
 * カレンダー同期ヘルパー
 * 便の gcal_event_id の有無に関わらず、予約人数をカレンダーに反映する。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCredentials, updateTripEventCounts } from "./google-calendar";

export async function syncTripCalendarCounts(
  tripId: string,
  supabase: SupabaseClient,
  accountId: string
): Promise<void> {
  const [{ data: trip }, { data: account }] = await Promise.all([
    supabase
      .from("trips")
      .select("trip_date, departure_time, return_time, target_species, fishing_method, location, capacity, gcal_event_id")
      .eq("id", tripId)
      .eq("account_id", accountId)
      .maybeSingle(),
    supabase
      .from("accounts")
      .select("google_calendar_id, google_service_account_email, google_service_account_private_key")
      .eq("id", accountId)
      .maybeSingle(),
  ]);

  if (!trip?.departure_time || !trip.return_time) return;

  const creds = resolveCredentials(account);
  if (!creds) return; // Google Calendar 未設定なら同期スキップ

  // passengers_count を合計して実際の乗船人数を算出
  const { data: reservationsData } = await supabase
    .from("reservations")
    .select("passengers_count")
    .eq("trip_id", tripId)
    .neq("status", "cancelled");

  const reservedCount = (reservationsData ?? []).reduce(
    (sum, r) => sum + (r.passengers_count ?? 0),
    0
  );

  const tripAny = trip as Record<string, unknown>;
  const eventInput = {
    tripId,
    tripDate: trip.trip_date,
    departureTime: trip.departure_time.slice(0, 5),
    returnTime: trip.return_time.slice(0, 5),
    targetSpecies: trip.target_species ?? undefined,
    fishingMethod: (tripAny.fishing_method as string | null) ?? undefined,
    location: (tripAny.location as string | null) ?? undefined,
    capacity: trip.capacity ?? undefined,
    reservedCount,
  };

  if (trip.gcal_event_id) {
    await updateTripEventCounts(trip.gcal_event_id, eventInput, creds);
  }
}

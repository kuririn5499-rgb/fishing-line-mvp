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
      .select("trip_date, departure_time, return_time, target_species, capacity, gcal_event_id")
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
    await updateTripEventCounts(trip.gcal_event_id, eventInput, creds);
  }
}

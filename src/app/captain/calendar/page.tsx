/**
 * /captain/calendar — 便カレンダー
 * 月別カレンダーで便ステータスを色分け表示
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { TripCalendar } from "@/components/captain/TripCalendar";
import { todayJST } from "@/lib/repositories/utils";

export default async function CaptainCalendarPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();
  const today = todayJST();

  // 今月の前後2ヶ月分を取得
  const from = new Date();
  from.setMonth(from.getMonth() - 2);
  from.setDate(1);
  const until = new Date();
  until.setMonth(until.getMonth() + 3);
  until.setDate(0);

  const [{ data: tripsRaw }, { data: reservationRows }] = await Promise.all([
    supabase
      .from("trips")
      .select("id, trip_date, departure_time, target_species, status, capacity, boats(name)")
      .eq("account_id", session.accountId)
      .gte("trip_date", from.toISOString().slice(0, 10))
      .lte("trip_date", until.toISOString().slice(0, 10))
      .order("trip_date", { ascending: true })
      .order("departure_time", { ascending: true }),
    supabase
      .from("reservations")
      .select("trip_id, passengers_count")
      .eq("account_id", session.accountId)
      .neq("status", "cancelled"),
  ]);

  // 予約人数を集計
  const reservedMap = new Map<string, number>();
  for (const r of reservationRows ?? []) {
    reservedMap.set(r.trip_id, (reservedMap.get(r.trip_id) ?? 0) + (r.passengers_count ?? 0));
  }

  const trips = (tripsRaw ?? []).map((t) => {
    const boats = t.boats as unknown as { name: string } | { name: string }[] | null;
    const boatName = (Array.isArray(boats) ? boats[0]?.name : boats?.name) ?? null;
    return {
      id: t.id,
      trip_date: t.trip_date,
      departure_time: t.departure_time,
      target_species: t.target_species,
      status: t.status,
      boat_name: boatName,
      reserved: reservedMap.get(t.id) ?? 0,
      capacity: t.capacity,
    };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">カレンダー</h1>
      <TripCalendar trips={trips} today={today} />
    </div>
  );
}

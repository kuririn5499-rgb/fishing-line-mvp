/**
 * /customer/schedules — 出船情報
 * 今後の便一覧を表示する（船長が登録した便のステータスを反映）
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { TripStatusBadge } from "@/components/ui/StatusBadge";
import { todayJST } from "@/lib/repositories/utils";
import type { Trip } from "@/types";

export default async function CustomerSchedulesPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();
  const today = todayJST();

  const { data: trips } = await supabase
    .from("trips")
    .select("*, boats(name)")
    .eq("account_id", session.accountId)
    .gte("trip_date", today)
    .order("trip_date", { ascending: true })
    .order("departure_time", { ascending: true })
    .limit(20);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">出船情報</h1>

      {!trips || trips.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-8">
            現在、受付中の便はありません
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {trips.map((trip: Trip & { boats?: { name: string } | null }) => (
            <Card key={trip.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TripStatusBadge status={trip.status} />
                    <span className="font-semibold text-sm">{trip.trip_date}</span>
                    {trip.departure_time && (
                      <span className="text-xs text-gray-500">
                        出発 {trip.departure_time}
                        {trip.return_time ? `〜${trip.return_time}` : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {trip.boats?.name ?? "—"}
                    {trip.target_species ? ` ／ ${trip.target_species}` : ""}
                    {trip.capacity != null ? ` ／ 定員 ${trip.capacity}名` : ""}
                  </p>
                  {trip.weather_note && (
                    <p className="text-xs text-gray-400 mt-1 bg-gray-50 rounded p-2">
                      {trip.weather_note}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * /customer/catch — 釣果情報
 * 船長が投稿した釣果一覧を表示する
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";

export default async function CustomerCatchPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  // 釣果が記録されている乗務記録を新しい順に取得
  const { data: logs } = await supabase
    .from("duty_logs")
    .select("id, catch_summary, fishing_area, weather, recorded_at, trips(trip_date, departure_time, target_species, boats(name))")
    .eq("account_id", session.accountId)
    .not("catch_summary", "is", null)
    .order("recorded_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">釣果情報</h1>

      {!logs || logs.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-8">
            釣果情報はまだありません
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const trip = Array.isArray(log.trips) ? log.trips[0] : log.trips;
            const boat = trip
              ? (Array.isArray(trip.boats) ? trip.boats[0] : trip.boats) as { name: string } | null
              : null;
            const date = trip?.trip_date ?? (log.recorded_at ? log.recorded_at.slice(0, 10) : "—");
            return (
              <Card key={log.id}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">{date}</span>
                    {trip?.departure_time && (
                      <span className="text-xs text-gray-400">{trip.departure_time}〜</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {boat?.name ?? "—"}
                    {trip?.target_species ? ` ／ ${trip.target_species}` : ""}
                    {log.fishing_area ? ` ／ ${log.fishing_area}` : ""}
                    {log.weather ? ` ／ 天候: ${log.weather}` : ""}
                  </p>
                  <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap">
                    {log.catch_summary}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

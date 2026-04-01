/**
 * /captain/manifests — 乗船名簿一覧（船長確認用）
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { todayJST } from "@/lib/repositories/utils";

export default async function CaptainManifestsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();
  const today = todayJST();

  // 本日の便
  const { data: todayTrips } = await supabase
    .from("trips")
    .select("id, trip_date, departure_time, target_species, boats(name)")
    .eq("account_id", session.accountId)
    .eq("trip_date", today)
    .in("status", ["open", "confirmed", "full", "completed"]);

  const tripIds = todayTrips?.map((t) => t.id) ?? [];

  // 便に紐づく予約
  const { data: reservations } = tripIds.length
    ? await supabase
        .from("reservations")
        .select("id, reservation_code, passengers_count, status, trip_id")
        .in("trip_id", tripIds)
        .neq("status", "cancelled")
    : { data: [] };

  const reservationIds = reservations?.map((r) => r.id) ?? [];

  // 名簿一覧
  const { data: manifests } = reservationIds.length
    ? await supabase
        .from("boarding_manifests")
        .select("reservation_id, full_name, submitted_at, companions_json")
        .in("reservation_id", reservationIds)
    : { data: [] };

  // 集計: 予約ごとに名簿提出済みかマップ
  const manifestMap = new Map(
    (manifests ?? []).map((m) => [m.reservation_id, m])
  );

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">乗船名簿確認</h1>
      <p className="text-xs text-gray-500">本日 ({today}) の名簿一覧</p>

      {!todayTrips || todayTrips.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-6">
            本日の便はありません
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {todayTrips.map((trip) => {
            const tripReservations = (reservations ?? []).filter(
              (r) => r.trip_id === trip.id
            );
            const submitted = tripReservations.filter((r) =>
              manifestMap.has(r.id)
            ).length;

            return (
              <section key={trip.id}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-gray-700">
                    {trip.departure_time ?? "—"} {trip.boats?.name ?? ""}{" "}
                    {trip.target_species ?? ""}
                  </h2>
                  <span className="text-xs text-gray-500">
                    {submitted}/{tripReservations.length} 件提出
                  </span>
                </div>

                {tripReservations.length === 0 ? (
                  <Card>
                    <p className="text-xs text-gray-400 text-center py-2">
                      予約なし
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {tripReservations.map((r) => {
                      const manifest = manifestMap.get(r.id);
                      const companions =
                        (manifest?.companions_json as unknown[])?.length ?? 0;

                      return (
                        <Card key={r.id}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                {manifest?.full_name ?? "（未提出）"}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                予約コード: {r.reservation_code} / {r.passengers_count}名
                                {companions > 0 && ` ＋同行者${companions}名`}
                              </p>
                              {manifest?.submitted_at && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  提出:{" "}
                                  {new Date(manifest.submitted_at).toLocaleTimeString(
                                    "ja-JP",
                                    { hour: "2-digit", minute: "2-digit" }
                                  )}
                                </p>
                              )}
                            </div>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                manifest
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-50 text-red-500"
                              }`}
                            >
                              {manifest ? "提出済" : "未提出"}
                            </span>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

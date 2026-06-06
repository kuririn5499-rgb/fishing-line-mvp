/**
 * /captain/trips — 便管理
 * 便一覧・便作成・ステータス変更
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { TripStatusBadge } from "@/components/ui/StatusBadge";
import { TripCreateForm } from "@/components/forms/TripCreateForm";
import { TripEditForm } from "@/components/forms/TripEditForm";
import { TripStatusUpdater } from "@/components/forms/TripStatusUpdater";
import { DepartureNoticeButton } from "@/components/forms/DepartureNoticeButton";
import { todayJST, formatPrice } from "@/lib/repositories/utils";
import type { Trip } from "@/types";

export default async function CaptainTripsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  // 本日以降の便のみ表示
  const today = todayJST();

  const { data: trips } = await supabase
    .from("trips")
    .select("*, boats(name)")
    .eq("account_id", session.accountId)
    .gte("trip_date", today)
    .order("trip_date", { ascending: true })
    .order("departure_time", { ascending: true })
    .limit(50);

  // 船一覧（便作成フォーム用）
  const { data: boats } = await supabase
    .from("boats")
    .select("id, name")
    .eq("account_id", session.accountId)
    .eq("is_active", true);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-gray-800">便管理</h1>

      {/* 便作成フォーム */}
      <TripCreateForm boats={boats ?? []} />

      {/* 便一覧 */}
      <section>
        <h2 className="text-sm font-bold text-gray-600 mb-2">便一覧</h2>
        {!trips || trips.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-400 text-center py-4">便がありません</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {(trips as (Trip & { boats?: { name: string } | null })[]).map((trip) => (
              <Card key={trip.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <TripStatusBadge status={trip.status} />
                      <span className="text-sm font-semibold">
                        {trip.trip_date}
                      </span>
                      {trip.departure_time && (
                        <span className="text-xs text-gray-500">
                          {trip.departure_time.slice(0, 5)}〜{trip.return_time?.slice(0, 5) ?? ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {trip.boats?.name ?? "—"} / {trip.target_species ?? "—"} /
                      定員 {trip.capacity ?? "—"}名
                      {trip.price_per_person != null && (
                        <span className="text-gray-700 font-medium ml-1">
                          / {formatPrice(trip.price_per_person)}/名
                        </span>
                      )}
                    </p>
                    {trip.weather_note && (
                      <p className="text-xs text-gray-400 mt-0.5">{trip.weather_note}</p>
                    )}
                    {/* インライン編集フォーム */}
                    <TripEditForm trip={trip} boats={boats ?? []} />
                  </div>
                </div>
                {/* ステータス変更・出船判断 */}
                <TripStatusUpdater tripId={trip.id} currentStatus={trip.status}>
                  <DepartureNoticeButton
                    tripId={trip.id}
                    tripDate={trip.trip_date}
                    departureTime={trip.departure_time}
                    targetSpecies={trip.target_species}
                  />
                </TripStatusUpdater>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

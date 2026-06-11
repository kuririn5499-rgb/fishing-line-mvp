/**
 * /captain/trips — 便管理
 * 便一覧・便作成・ステータス変更
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { TripStatusBadge } from "@/components/ui/StatusBadge";
import { TripCreateForm } from "@/components/forms/TripCreateForm";
import { ClosedDayForm } from "@/components/forms/ClosedDayForm";
import { TripEditForm } from "@/components/forms/TripEditForm";
import { TripStatusUpdater } from "@/components/forms/TripStatusUpdater";
import { TripDeleteButton } from "@/components/forms/TripDeleteButton";
import { DepartureNoticeButton } from "@/components/forms/DepartureNoticeButton";
import { todayJST, formatPrice, formatDateWithDay } from "@/lib/repositories/utils";
import type { Trip } from "@/types";

export default async function CaptainTripsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  // 本日以降の便のみ表示
  const today = todayJST();

  // 便一覧（pre_departure_checks をJOINで取得）+ 船一覧 + タグを並列取得
  const [{ data: tripsRaw }, { data: boats }, { data: tagsRaw }] = await Promise.all([
    supabase
      .from("trips")
      .select("*, boats(name), pre_departure_checks(departure_judgement, cancel_reason)")
      .eq("account_id", session.accountId)
      .gte("trip_date", today)
      .order("trip_date", { ascending: true })
      .order("departure_time", { ascending: true })
      .limit(50),
    supabase
      .from("boats")
      .select("id, name")
      .eq("account_id", session.accountId)
      .eq("is_active", true),
    supabase
      .from("fishing_tags")
      .select("tag_type, name")
      .eq("account_id", session.accountId)
      .order("name", { ascending: true }),
  ]);

  const methodTags = (tagsRaw ?? []).filter((t) => t.tag_type === "method").map((t) => t.name);
  const locationTags = (tagsRaw ?? []).filter((t) => t.tag_type === "location").map((t) => t.name);

  type DepartureCheck = { departure_judgement: string | null; cancel_reason: string | null };
  const departureMap = new Map(
    (tripsRaw ?? []).flatMap((t) => {
      const checks = t.pre_departure_checks as unknown as DepartureCheck[] | null;
      const check = checks?.[0];
      if (!check?.departure_judgement) return [];
      return [[t.id, { judgement: check.departure_judgement as "go" | "cancel", cancelReason: check.cancel_reason }]];
    })
  );

  const trips = tripsRaw as typeof tripsRaw;

  // 便ごとの予約人数を集計
  const tripIdList = (tripsRaw ?? []).map((t) => t.id);
  const { data: reservationRows } = tripIdList.length > 0
    ? await supabase
        .from("reservations")
        .select("trip_id, passengers_count")
        .in("trip_id", tripIdList)
        .neq("status", "cancelled")
    : { data: [] };

  const reservedMap = new Map<string, number>();
  for (const r of reservationRows ?? []) {
    reservedMap.set(r.trip_id, (reservedMap.get(r.trip_id) ?? 0) + (r.passengers_count ?? 0));
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-gray-800">便管理</h1>

      {/* 便作成・休船設定 */}
      <div className="space-y-2">
        <TripCreateForm boats={boats ?? []} methodTags={methodTags} locationTags={locationTags} />
        <ClosedDayForm />
      </div>

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
                        {formatDateWithDay(trip.trip_date)}
                      </span>
                      {trip.departure_time && (
                        <span className="text-xs text-gray-500">
                          {trip.departure_time.slice(0, 5)}〜{trip.return_time?.slice(0, 5) ?? ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {trip.boats?.name ?? "—"} / {trip.fishing_method ?? trip.target_species ?? "—"}
                      {trip.location ? ` / ${trip.location}` : ""} /
                      定員 {trip.capacity ?? "—"}名
                      {trip.price_per_person != null && (
                        <span className="text-gray-700 font-medium ml-1">
                          / {formatPrice(trip.price_per_person)}/名
                        </span>
                      )}
                    </p>
                    <p className="text-xs mt-0.5">
                      {(() => {
                        const reserved = reservedMap.get(trip.id) ?? 0;
                        const cap = trip.capacity ?? null;
                        const isFull = cap !== null && reserved >= cap;
                        return (
                          <span className={isFull ? "text-red-500 font-medium" : "text-brand-600 font-medium"}>
                            予約 {reserved}名
                            {cap !== null && <span className="text-gray-400 font-normal"> / 定員 {cap}名</span>}
                          </span>
                        );
                      })()}
                    </p>
                    {trip.weather_note && (
                      <p className="text-xs text-gray-400 mt-0.5">{trip.weather_note}</p>
                    )}
                    {/* インライン編集フォーム */}
                    <TripEditForm trip={trip} boats={boats ?? []} methodTags={methodTags} locationTags={locationTags} />
                  </div>
                </div>
                {/* ステータス変更・出船判断・削除 */}
                <TripStatusUpdater tripId={trip.id} currentStatus={trip.status}>
                  <DepartureNoticeButton
                    tripId={trip.id}
                    tripDate={trip.trip_date}
                    departureTime={trip.departure_time}
                    targetSpecies={trip.target_species}
                    initialJudgement={departureMap.get(trip.id)?.judgement ?? null}
                    initialCancelReason={departureMap.get(trip.id)?.cancelReason ?? null}
                  />
                  <TripDeleteButton tripId={trip.id} />
                </TripStatusUpdater>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

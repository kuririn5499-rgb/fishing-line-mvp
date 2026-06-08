/**
 * /captain/reservations — 予約一覧 + 手動予約入力
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { todayJST, formatPrice, formatDateWithDay } from "@/lib/repositories/utils";
import { Card } from "@/components/ui/Card";
import { ReservationStatusBadge } from "@/components/ui/StatusBadge";
import { ManualReservationForm } from "@/components/forms/ManualReservationForm";
import { CancelReservationButton } from "@/components/forms/CancelReservationButton";
import { ReplyButton } from "@/components/forms/ReplyButton";

export default async function CaptainReservationsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();
  const today = todayJST();

  const until = new Date();
  until.setDate(until.getDate() + 30);

  const { data: trips } = await supabase
    .from("trips")
    .select("id, trip_date, departure_time, target_species, boats(name)")
    .eq("account_id", session.accountId)
    .gte("trip_date", today)
    .lte("trip_date", until.toISOString().slice(0, 10))
    .not("status", "in", '("cancelled","completed")')
    .order("trip_date", { ascending: true })
    .order("departure_time", { ascending: true });

  const tripOptions = (trips ?? []).map((t) => {
    const boats = t.boats as unknown as { name: string } | { name: string }[] | null;
    const boatName = Array.isArray(boats) ? boats[0]?.name ?? null : boats?.name ?? null;
    return {
      id: t.id,
      trip_date: t.trip_date,
      departure_time: t.departure_time,
      target_species: t.target_species,
      boat_name: boatName,
    };
  });

  const { data: reservations } = await supabase
    .from("reservations")
    .select(`
      id,
      status,
      passengers_count,
      memo,
      coupon_id,
      discount_amount,
      trips(id, trip_date, departure_time, target_species, price_per_person, boats(name)),
      customers(full_name, phone)
    `)
    .eq("account_id", session.accountId)
    .order("created_at", { ascending: true })
    .limit(300);

  // 出船日が今日以降のものだけ表示
  type TripRow = {
    id: string;
    trip_date: string;
    departure_time: string | null;
    target_species: string | null;
    price_per_person: number | null;
    boats?: { name: string }[] | { name: string } | null;
  };
  type CustomerRow = { full_name: string | null; phone: string | null };

  const filtered = (reservations ?? []).filter((r) => {
    const trip = Array.isArray(r.trips) ? r.trips[0] : (r.trips as TripRow | null);
    return trip ? trip.trip_date >= today : false;
  });

  // 便ごとにグループ化 → trip_date 昇順でソート
  type ReservationRow = (typeof filtered)[number];
  type TripGroup = { trip: TripRow; reservations: ReservationRow[] };
  const groupMap = new Map<string, TripGroup>();
  const groupOrder: string[] = [];

  for (const r of filtered) {
    const tripRaw = Array.isArray(r.trips) ? r.trips[0] : (r.trips as TripRow | null);
    if (!tripRaw) continue;
    if (!groupMap.has(tripRaw.id)) {
      groupMap.set(tripRaw.id, { trip: tripRaw, reservations: [] });
      groupOrder.push(tripRaw.id);
    }
    groupMap.get(tripRaw.id)!.reservations.push(r);
  }

  const groups = groupOrder
    .map((id) => groupMap.get(id)!)
    .sort((a, b) => a.trip.trip_date.localeCompare(b.trip.trip_date));

  const SHEET_URL =
    "https://docs.google.com/spreadsheets/d/1u-04jSpvzKy_4KR-BsynMjxZ2EK1l6faEEWEqndojsg/edit#gid=451391544";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">予約管理</h1>
        <a
          href={SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition"
        >
          📊 シートを見る
        </a>
      </div>

      {/* 手動予約フォーム */}
      <ManualReservationForm trips={tripOptions} />

      {/* 予約一覧 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-2">
          予約一覧（{filtered.length}件）
        </h2>

        {groups.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-400 text-center py-6">予約がありません</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map(({ trip, reservations: rList }) => {
              const boatName = Array.isArray(trip.boats)
                ? trip.boats[0]?.name
                : (trip.boats as { name: string } | null)?.name ?? null;

              return (
                <section key={trip.id}>
                  {/* 便ヘッダー */}
                  <div className="flex items-center gap-2 px-1 mb-1.5">
                    <span className="text-xs font-bold text-gray-700">
                      {formatDateWithDay(trip.trip_date)}
                      {trip.departure_time ? ` ${trip.departure_time.slice(0, 5)}〜` : ""}
                    </span>
                    <span className="text-xs text-gray-400">
                      {boatName ?? ""}{trip.target_species ? ` / ${trip.target_species}` : ""}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {rList.length}件
                    </span>
                  </div>

                  {/* 予約行 */}
                  <div className="space-y-1.5">
                    {rList.map((r) => {
                      const customer = Array.isArray(r.customers)
                        ? (r.customers[0] as CustomerRow ?? null)
                        : (r.customers as CustomerRow | null);

                      const discountAmount = (r as { discount_amount?: number | null }).discount_amount;
                      const discountPer =
                        discountAmount && r.passengers_count
                          ? Math.round(discountAmount / r.passengers_count)
                          : 0;

                      return (
                        <Card key={r.id} className="py-2 px-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* ステータス */}
                            <ReservationStatusBadge
                              status={r.status as "pending" | "confirmed" | "waitlist" | "cancelled" | "completed"}
                            />
                            {/* 氏名 */}
                            <span className="text-sm font-medium text-gray-800">
                              {customer?.full_name ?? "（氏名未登録）"}
                            </span>
                            {/* 電話 */}
                            {customer?.phone && (
                              <a href={`tel:${customer.phone}`} className="text-xs text-brand-600 underline">
                                {customer.phone}
                              </a>
                            )}
                            {/* 人数・金額 */}
                            <span className="text-xs text-gray-500">{r.passengers_count}名</span>
                            {trip.price_per_person != null && (
                              discountPer > 0 ? (
                                <span className="text-xs text-gray-700">
                                  <span className="line-through text-gray-400 mr-1">
                                    {formatPrice(trip.price_per_person!)}
                                  </span>
                                  {formatPrice(trip.price_per_person! - discountPer)}
                                  <span className="text-green-600 ml-1">🎟️-¥{discountPer.toLocaleString()}</span>
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">
                                  {formatPrice(trip.price_per_person!)}/名
                                </span>
                              )
                            )}
                            {/* アクション */}
                            <span className="ml-auto flex items-center gap-2">
                              <ReplyButton
                                reservationId={r.id}
                                customerName={customer?.full_name ?? null}
                              />
                              <CancelReservationButton
                                reservationId={r.id}
                                currentStatus={r.status}
                                couponId={r.coupon_id}
                              />
                            </span>
                          </div>
                          {r.memo && (
                            <p className="text-xs text-gray-400 mt-0.5 pl-0.5">
                              📝 {r.memo}
                            </p>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

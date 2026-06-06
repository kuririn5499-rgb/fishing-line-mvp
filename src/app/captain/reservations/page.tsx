/**
 * /captain/reservations — 予約一覧 + 手動予約入力
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { todayJST, formatPrice } from "@/lib/repositories/utils";
import { Card } from "@/components/ui/Card";
import { ReservationStatusBadge } from "@/components/ui/StatusBadge";
import { ManualReservationForm } from "@/components/forms/ManualReservationForm";
import { CancelReservationButton } from "@/components/forms/CancelReservationButton";

export default async function CaptainReservationsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  const today = todayJST();

  // 手動予約フォーム用：本日〜30日先の便
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

  // 予約一覧：本日以降のキャンセル以外 + キャンセル済みは当日のみ
  const { data: reservations } = await supabase
    .from("reservations")
    .select(`
      id,
      reservation_code,
      status,
      passengers_count,
      memo,
      created_at,
      coupon_id,
      discount_amount,
      trips(id, trip_date, departure_time, target_species, price_per_person, boats(name)),
      customers(full_name, phone)
    `)
    .eq("account_id", session.accountId)
    .order("created_at", { ascending: false })
    .limit(200);

  // 出船日が今日以降のものだけ表示
  const filtered = (reservations ?? []).filter((r) => {
    type TripRow = { trip_date: string };
    const trip = Array.isArray(r.trips) ? r.trips[0] : r.trips as TripRow | null;
    if (!trip) return false;
    return trip.trip_date >= today;
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">予約管理</h1>

      {/* 手動予約フォーム */}
      <ManualReservationForm trips={tripOptions} />

      {/* 予約一覧 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-2">予約一覧</h2>

        {filtered.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-400 text-center py-6">予約がありません</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              type TripRow = {
                trip_date: string;
                departure_time: string | null;
                target_species: string | null;
                price_per_person: number | null;
                boats?: { name: string }[] | null;
              };
              const tripRaw = r.trips as unknown as TripRow | TripRow[] | null;
              const trip = Array.isArray(tripRaw) ? tripRaw[0] ?? null : tripRaw;
              const boatName = Array.isArray(trip?.boats) ? trip?.boats[0]?.name : null;
              const discountAmount = (r as { discount_amount?: number | null }).discount_amount;
              const discountPer = discountAmount && r.passengers_count
                ? Math.round(discountAmount / r.passengers_count) : 0;

              type CustomerRow = { full_name: string | null; phone: string | null };
              const custRaw = r.customers as unknown as CustomerRow | CustomerRow[] | null;
              const customer = Array.isArray(custRaw) ? custRaw[0] ?? null : custRaw;

              return (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ReservationStatusBadge
                          status={r.status as "pending" | "confirmed" | "waitlist" | "cancelled" | "completed"}
                        />
                        <span className="text-sm font-semibold">
                          {trip?.trip_date ?? "—"}
                          {trip?.departure_time ? ` ${trip.departure_time.slice(0, 5)}〜` : ""}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {boatName ?? "—"} / {trip?.target_species ?? "—"} / {r.passengers_count}名
                      </p>
                      {trip?.price_per_person != null && (() => {
                        const base = trip.price_per_person!;
                        return discountPer > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-xs text-gray-400 line-through">
                              {formatPrice(base)}/名
                            </span>
                            <span className="text-sm font-bold text-gray-800">
                              {formatPrice(base - discountPer)}
                              <span className="text-xs font-normal text-gray-500">/名</span>
                            </span>
                            <span className="text-xs bg-green-50 text-green-700 font-medium px-1.5 py-0.5 rounded-full">
                              🎟️ ¥{discountPer.toLocaleString()} OFF
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs font-semibold text-gray-700 mt-0.5">
                            {formatPrice(base)}/名
                          </p>
                        );
                      })()}
                      <p className="text-sm font-medium text-gray-700 mt-1">
                        {customer?.full_name ?? "（氏名未登録）"}
                        {customer?.phone ? (
                          <a
                            href={`tel:${customer.phone}`}
                            className="ml-2 text-xs text-brand-600 underline"
                          >
                            {customer.phone}
                          </a>
                        ) : null}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        予約コード: {r.reservation_code}
                      </p>
                      {r.memo && (
                        <p className="text-xs text-gray-400 mt-0.5">メモ: {r.memo}</p>
                      )}
                      <div className="mt-2">
                        <CancelReservationButton
                          reservationId={r.id}
                          currentStatus={r.status}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

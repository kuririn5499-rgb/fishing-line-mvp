/**
 * /customer/reservations — 予約一覧 + 新規予約
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { ReservationStatusBadge } from "@/components/ui/StatusBadge";
import { ReservationForm } from "@/components/forms/ReservationForm";
import type { Reservation, Trip } from "@/types";

type ReservationWithTrip = Reservation & {
  trips: Pick<Trip, "trip_date" | "departure_time" | "target_species" | "status"> | null;
};

export default async function CustomerReservationsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  // 自分の customer レコード
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", session.userId)
    .maybeSingle();

  // 自分の予約一覧（便情報と JOIN）
  const { data: reservations } = customer
    ? await supabase
        .from("reservations")
        .select("*, trips(trip_date, departure_time, target_species, status)")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  // 受付中の便一覧（新規予約フォーム用）
  const today = new Date().toISOString().slice(0, 10);
  const { data: openTrips } = await supabase
    .from("trips")
    .select("id, trip_date, departure_time, target_species, capacity, boats(name)")
    .eq("account_id", session.accountId)
    .gte("trip_date", today)
    .in("status", ["open"])
    .order("trip_date", { ascending: true })
    .limit(20);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-gray-800">予約管理</h1>

      {/* 新規予約フォーム */}
      {openTrips && openTrips.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-600 mb-2">新しく予約する</h2>
          <ReservationForm trips={openTrips as unknown as Trip[]} />
        </section>
      )}

      {/* 予約一覧 */}
      <section>
        <h2 className="text-sm font-bold text-gray-600 mb-2">予約履歴</h2>
        {!reservations || reservations.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-400 text-center py-4">予約はありません</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {(reservations as ReservationWithTrip[]).map((r) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">
                      {r.trips?.trip_date ?? "—"}
                      {r.trips?.departure_time ? ` ${r.trips.departure_time}〜` : ""}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {r.trips?.target_species ?? "—"} / {r.passengers_count}名
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      予約コード: {r.reservation_code}
                    </p>
                  </div>
                  <ReservationStatusBadge status={r.status} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

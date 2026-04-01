/**
 * /captain/reservations — 予約一覧（船長確認用）
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { ReservationStatusBadge, TripStatusBadge } from "@/components/ui/StatusBadge";

export default async function CaptainReservationsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  // 直近30日の予約（便・顧客情報と JOIN）
  const since = new Date();
  since.setDate(since.getDate() - 3);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: reservations } = await supabase
    .from("reservations")
    .select(`
      id,
      reservation_code,
      status,
      passengers_count,
      memo,
      created_at,
      trips(id, trip_date, departure_time, target_species, status, boats(name)),
      customers(full_name, phone)
    `)
    .eq("account_id", session.accountId)
    .gte("trips.trip_date", sinceStr)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">予約一覧</h1>

      {!reservations || reservations.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-6">予約がありません</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {reservations.map((r) => {
            const trip = r.trips as {
              trip_date: string;
              departure_time: string | null;
              target_species: string | null;
              status: string;
              boats?: { name: string } | null;
            } | null;

            const customer = r.customers as {
              full_name: string | null;
              phone: string | null;
            } | null;

            return (
              <Card key={r.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ReservationStatusBadge status={r.status as "pending" | "confirmed" | "waitlist" | "cancelled" | "completed"} />
                      <span className="text-sm font-semibold">
                        {trip?.trip_date ?? "—"} {trip?.departure_time ?? ""}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {trip?.boats?.name ?? "—"} / {trip?.target_species ?? "—"} /
                      {r.passengers_count}名
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {customer?.full_name ?? "（氏名未登録）"}
                      {customer?.phone ? ` — ${customer.phone}` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      コード: {r.reservation_code}
                    </p>
                    {r.memo && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        メモ: {r.memo}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

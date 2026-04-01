/**
 * /captain/trips — 便管理
 * 便一覧・便作成・ステータス変更
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { TripStatusBadge } from "@/components/ui/StatusBadge";
import { TripCreateForm } from "@/components/forms/TripCreateForm";
import { TripStatusUpdater } from "@/components/forms/TripStatusUpdater";
import type { Trip } from "@/types";

export default async function CaptainTripsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  // 直近30日 + 未来の便
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: trips } = await supabase
    .from("trips")
    .select("*, boats(name)")
    .eq("account_id", session.accountId)
    .gte("trip_date", sinceStr)
    .order("trip_date", { ascending: false })
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
                          {trip.departure_time}〜{trip.return_time ?? ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {trip.boats?.name ?? "—"} / {trip.target_species ?? "—"} /
                      定員 {trip.capacity ?? "—"}名
                    </p>
                  </div>
                </div>
                {/* ステータス変更 */}
                <TripStatusUpdater tripId={trip.id} currentStatus={trip.status} />
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

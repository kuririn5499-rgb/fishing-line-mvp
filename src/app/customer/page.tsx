/**
 * /customer — customer ホーム画面
 * 出船情報・予約へのクイックリンクを表示する
 */

import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { TripStatusBadge } from "@/components/ui/StatusBadge";
import { todayJST } from "@/lib/repositories/utils";
import type { Trip } from "@/types";

export default async function CustomerHomePage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();
  const today = todayJST();

  // 本日以降の open / confirmed 便を取得（customer が見る出船情報）
  const { data: upcomingTrips } = await supabase
    .from("trips")
    .select("*, boats(name)")
    .eq("account_id", session.accountId)
    .gte("trip_date", today)
    .in("status", ["open", "confirmed"])
    .order("trip_date", { ascending: true })
    .order("departure_time", { ascending: true })
    .limit(5);

  // 自分のポイント
  const { data: customer } = await supabase
    .from("customers")
    .select("points")
    .eq("user_id", session.userId)
    .maybeSingle();

  return (
    <div className="space-y-4">
      {/* ウェルカム */}
      <div className="pt-2">
        <p className="text-gray-500 text-sm">おはようございます</p>
        <h1 className="text-xl font-bold text-sea-dark">
          {session.displayName ?? "お客様"} さん
        </h1>
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/customer/reservations">
          <Card className="flex flex-col items-center gap-2 py-5 text-center hover:shadow-md transition-shadow">
            <span className="text-3xl">📅</span>
            <span className="text-sm font-medium text-gray-700">予約する</span>
          </Card>
        </Link>
        <Link href="/customer/manifest">
          <Card className="flex flex-col items-center gap-2 py-5 text-center hover:shadow-md transition-shadow">
            <span className="text-3xl">📋</span>
            <span className="text-sm font-medium text-gray-700">乗船名簿</span>
          </Card>
        </Link>
        <Link href="/customer/coupons">
          <Card className="flex flex-col items-center gap-2 py-5 text-center hover:shadow-md transition-shadow">
            <span className="text-3xl">🎟️</span>
            <span className="text-sm font-medium text-gray-700">クーポン</span>
          </Card>
        </Link>
        <Link href="/customer/points">
          <Card className="flex flex-col items-center gap-2 py-5 text-center hover:shadow-md transition-shadow">
            <span className="text-3xl">⭐</span>
            <span className="text-sm font-medium text-gray-700">
              ポイント
              {customer?.points != null && (
                <span className="block text-brand-600 font-bold">
                  {customer.points.toLocaleString()} pt
                </span>
              )}
            </span>
          </Card>
        </Link>
      </div>

      {/* 出船情報 */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-2">出船情報</h2>
        {!upcomingTrips || upcomingTrips.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-400 text-center py-4">
              現在、受付中の便はありません
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcomingTrips.map((trip: Trip & { boats?: { name: string } | null }) => (
              <Card key={trip.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">
                      {trip.trip_date} {trip.departure_time ? `${trip.departure_time}〜` : ""}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {trip.boats?.name ?? "—"} / {trip.target_species ?? "—"}
                    </p>
                  </div>
                  <TripStatusBadge status={trip.status} />
                </div>
                {trip.weather_note && (
                  <p className="text-xs text-gray-400 mt-2">{trip.weather_note}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

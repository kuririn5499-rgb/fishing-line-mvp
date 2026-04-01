/**
 * /captain — 船長ダッシュボード
 * 本日の便・未入力アラートを表示する
 */

import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card, CardHeader } from "@/components/ui/Card";
import { TripStatusBadge } from "@/components/ui/StatusBadge";
import { todayJST } from "@/lib/repositories/utils";

export default async function CaptainDashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();
  const today = todayJST();

  // 本日の便
  const { data: todayTrips } = await supabase
    .from("trips")
    .select("*, boats(name), pre_departure_checks(id), duty_logs(id)")
    .eq("account_id", session.accountId)
    .eq("trip_date", today)
    .order("departure_time", { ascending: true });

  const trips = todayTrips ?? [];

  // アラート集計
  const noPreCheck = trips.filter(
    (t) => !((t.pre_departure_checks as unknown[])?.length > 0)
  );
  const noDutyLog = trips.filter(
    (t) =>
      t.status === "completed" &&
      !((t.duty_logs as unknown[])?.length > 0)
  );

  // 今日の総予約数
  const { count: reservationCount } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .in("trip_id", trips.map((t) => t.id))
    .neq("status", "cancelled");

  // 名簿提出率
  const { count: manifestCount } = await supabase
    .from("boarding_manifests")
    .select("id", { count: "exact", head: true })
    .in(
      "reservation_id",
      (
        await supabase
          .from("reservations")
          .select("id")
          .in("trip_id", trips.map((t) => t.id))
          .neq("status", "cancelled")
      ).data?.map((r) => r.id) ?? []
    );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500">
          {new Date().toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
          })}
        </p>
        <h1 className="text-xl font-bold text-sea-dark">本日の状況</h1>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center py-3">
          <p className="text-2xl font-bold text-brand-600">{trips.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">本日の便</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-2xl font-bold text-brand-600">
            {reservationCount ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">予約数</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-2xl font-bold text-brand-600">
            {reservationCount
              ? Math.round(((manifestCount ?? 0) / reservationCount) * 100)
              : 0}
            %
          </p>
          <p className="text-xs text-gray-500 mt-0.5">名簿提出率</p>
        </Card>
      </div>

      {/* アラート */}
      {(noPreCheck.length > 0 || noDutyLog.length > 0) && (
        <div className="space-y-2">
          {noPreCheck.map((t) => (
            <Link key={t.id} href={`/captain/pre-departure?trip_id=${t.id}`}>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-yellow-500 text-xl">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    出船前検査が未入力
                  </p>
                  <p className="text-xs text-yellow-600">
                    {t.departure_time ?? ""} {t.boats?.name ?? ""} — タップして入力
                  </p>
                </div>
              </div>
            </Link>
          ))}
          {noDutyLog.map((t) => (
            <Link key={t.id} href={`/captain/duty-log?trip_id=${t.id}`}>
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-orange-500 text-xl">📝</span>
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    乗務記録が未入力
                  </p>
                  <p className="text-xs text-orange-600">
                    {t.departure_time ?? ""} {t.boats?.name ?? ""} — タップして入力
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 本日の便一覧 */}
      <section>
        <CardHeader title="本日の便" action={
          <Link href="/captain/trips" className="text-xs text-brand-600">
            すべて見る →
          </Link>
        } />
        {trips.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-400 text-center py-4">
              本日の便はありません
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {trips.map((trip) => {
              const hasPreCheck = (trip.pre_departure_checks as unknown[])?.length > 0;
              const hasDutyLog = (trip.duty_logs as unknown[])?.length > 0;
              return (
                <Card key={trip.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <TripStatusBadge status={trip.status} />
                        <span className="text-sm font-semibold">
                          {trip.departure_time ?? "—"}〜
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {trip.boats?.name ?? "—"} / {trip.target_species ?? "—"}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${hasPreCheck ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                          出船前検査 {hasPreCheck ? "✓" : "未"}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${hasDutyLog ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                          乗務記録 {hasDutyLog ? "✓" : "未"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* クイックリンク */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/captain/reservations">
          <Card className="flex items-center gap-3 hover:shadow-md transition-shadow">
            <span className="text-2xl">📋</span>
            <span className="text-sm font-medium">予約一覧</span>
          </Card>
        </Link>
        <Link href="/captain/fishing-report">
          <Card className="flex items-center gap-3 hover:shadow-md transition-shadow">
            <span className="text-2xl">🐟</span>
            <span className="text-sm font-medium">釣果投稿</span>
          </Card>
        </Link>
      </div>
    </div>
  );
}

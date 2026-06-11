/**
 * /captain — 船長ダッシュボード
 * 本日の便・未入力アラートを表示する
 */

import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card, CardHeader } from "@/components/ui/Card";
import { TripStatusBadge } from "@/components/ui/StatusBadge";
import { todayJST, formatDateWithDay } from "@/lib/repositories/utils";
import { ManualReservationForm } from "@/components/forms/ManualReservationForm";
import { InstallBanner } from "@/components/captain/InstallBanner";

export default async function CaptainDashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();
  const today = todayJST();
  const until = new Date();
  until.setDate(until.getDate() + 30);
  const sevenDaysLaterStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();

  // アカウント情報 + 本日の便 + 手動予約フォーム用の便 + ポイント申請 pending + リクエスト pending + 直近7日の便（やること用）を並列取得
  const [{ data: accountInfo }, { data: todayTrips }, { data: upcomingTrips }, { count: pendingRedemptions }, { count: pendingRequests }, { data: upcomingAlertTripsRaw }] = await Promise.all([
    supabase
      .from("accounts")
      .select("name, boat_name, last_read_reservations_at")
      .eq("id", session.accountId)
      .maybeSingle(),
    supabase
      .from("trips")
      .select("*, boats(name), pre_departure_checks(id), duty_logs(id)")
      .eq("account_id", session.accountId)
      .eq("trip_date", today)
      .order("departure_time", { ascending: true }),
    supabase
      .from("trips")
      .select("id, trip_date, departure_time, target_species, boats(name)")
      .eq("account_id", session.accountId)
      .gte("trip_date", today)
      .lte("trip_date", until.toISOString().slice(0, 10))
      .not("status", "in", '("cancelled","completed")')
      .order("trip_date", { ascending: true })
      .order("departure_time", { ascending: true }),
    supabase
      .from("point_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("account_id", session.accountId)
      .eq("status", "pending"),
    supabase
      .from("trip_requests")
      .select("id", { count: "exact", head: true })
      .eq("account_id", session.accountId)
      .eq("status", "pending"),
    supabase
      .from("trips")
      .select("id, trip_date, departure_time, target_species, boats(name), reservations(id, status)")
      .eq("account_id", session.accountId)
      .gt("trip_date", today)
      .lte("trip_date", sevenDaysLaterStr)
      .not("status", "in", '("cancelled","completed")')
      .order("trip_date", { ascending: true }),
  ]);

  const trips = todayTrips ?? [];

  const tripOptions = (upcomingTrips ?? []).map((t) => {
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

  // 直近7日の便のうち予約がある便（やること用）
  type UpcomingAlertTrip = {
    id: string;
    trip_date: string;
    departure_time: string | null;
    target_species: string | null;
    boats: { name: string } | { name: string }[] | null;
    reservations: { id: string; status: string }[] | null;
  };
  const upcomingTripTodos = ((upcomingAlertTripsRaw ?? []) as UpcomingAlertTrip[]).filter(
    (trip) => ((trip.reservations ?? []) as { id: string; status: string }[]).some((r) => r.status !== "cancelled")
  );

  // アラート集計（中止・完了便は除外）
  const activeTrips = trips.filter(
    (t) => t.status !== "cancelled"
  );
  const noPreCheck = activeTrips.filter(
    (t) => !((t.pre_departure_checks as unknown[])?.length > 0)
  );
  const noDutyLog = trips.filter(
    (t) =>
      t.status === "completed" &&
      !((t.duty_logs as unknown[])?.length > 0)
  );

  // 未読予約数（last_read_reservations_at 以降に作成された予約）
  const lastReadAt = accountInfo?.last_read_reservations_at ?? null;
  const { count: unreadReservations } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("account_id", session.accountId)
    .neq("status", "cancelled")
    .gt("created_at", lastReadAt ?? "1970-01-01T00:00:00Z");

  // 予約IDを1回だけ取得してカウントと名簿検索に共用
  const tripIdList = trips.map((t) => t.id);
  const { data: reservationData } = tripIdList.length > 0
    ? await supabase
        .from("reservations")
        .select("id")
        .in("trip_id", tripIdList)
        .neq("status", "cancelled")
    : { data: [] };

  const reservationIds = (reservationData ?? []).map((r) => r.id);
  const reservationCount = reservationIds.length;

  const { count: manifestCount } = reservationIds.length > 0
    ? await supabase
        .from("boarding_manifests")
        .select("id", { count: "exact", head: true })
        .in("reservation_id", reservationIds)
    : { count: 0 };

  return (
    <div className="space-y-4">
      <InstallBanner />
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
        {(accountInfo?.boat_name || accountInfo?.name) && (
          <p className="text-sm font-medium text-brand-600 mt-0.5">
            🚢 {accountInfo.boat_name ?? accountInfo.name}
          </p>
        )}
      </div>

      {/* やること */}
      {(() => {
        const todos: Array<{
          key: string;
          href: string;
          icon: string;
          label: string;
          sub: string;
          count?: number;
          urgent: boolean;
        }> = [];
        if ((unreadReservations ?? 0) > 0)
          todos.push({ key: "res", href: "/captain/reservations", icon: "📋", label: `新しい予約が ${unreadReservations}件`, sub: "確認・承認してください", count: unreadReservations as number, urgent: true });
        if ((pendingRequests ?? 0) > 0)
          todos.push({ key: "req", href: "/captain/trip-requests", icon: "🙋", label: `便リクエストが ${pendingRequests}件`, sub: "承認・却下してください", count: pendingRequests as number, urgent: true });
        if ((pendingRedemptions ?? 0) > 0)
          todos.push({ key: "rdm", href: "/captain/points", icon: "⭐", label: `ポイント申請が ${pendingRedemptions}件`, sub: "確認してください", count: pendingRedemptions as number, urgent: true });
        for (const trip of upcomingTripTodos) {
          const boatName = Array.isArray(trip.boats) ? trip.boats[0]?.name : (trip.boats as { name: string } | null)?.name;
          const prevDay = (() => { const d = new Date(trip.trip_date + "T00:00:00"); d.setDate(d.getDate() - 1); return `${d.getMonth() + 1}/${d.getDate()}`; })();
          todos.push({
            key: `trip-${trip.id}`,
            href: `/captain/manifests`,
            icon: "⚓",
            label: `${formatDateWithDay(trip.trip_date)} 名簿確認・出船情報`,
            sub: `${boatName ? boatName + " / " : ""}${trip.target_species ?? ""} — ${prevDay}までに完了`,
            urgent: false,
          });
        }
        return (
          <section>
            <h2 className="text-sm font-bold text-gray-700 mb-2">📌 やること</h2>
            {todos.length === 0 ? (
              <div className="rounded-xl px-4 py-3 flex items-center gap-3 bg-green-50 border border-green-100">
                <span className="text-lg">✅</span>
                <p className="text-sm font-medium text-green-700">やることはありません</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {todos.map((todo) => (
                  <Link key={todo.key} href={todo.href} className="block">
                    <div className={`rounded-xl px-4 py-3 flex items-center gap-3 border transition-colors ${todo.urgent ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                      <span className="text-xl shrink-0">{todo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${todo.urgent ? "text-red-800" : "text-amber-800"}`}>{todo.label}</p>
                        <p className={`text-xs mt-0.5 ${todo.urgent ? "text-red-600" : "text-amber-600"}`}>{todo.sub}</p>
                      </div>
                      {todo.count != null && (
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shrink-0">
                          {todo.count > 99 ? "99+" : todo.count}
                        </span>
                      )}
                      <span className="text-gray-300 text-lg shrink-0">›</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })()}

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/captain/trips">
          <Card className="text-center py-3 hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-brand-600">{trips.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">本日の便</p>
          </Card>
        </Link>
        <Link href="/captain/reservations">
          <Card className="text-center py-3 hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-brand-600">
              {reservationCount ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">予約数</p>
          </Card>
        </Link>
        <Link href="/captain/manifests">
          <Card className="text-center py-3 hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-brand-600">
              {reservationCount
                ? Math.round(((manifestCount ?? 0) / reservationCount) * 100)
                : 0}
              %
            </p>
            <p className="text-xs text-gray-500 mt-0.5">名簿提出率</p>
          </Card>
        </Link>
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
          <Card className="flex items-center gap-3 hover:shadow-md transition-shadow relative">
            <span className="text-2xl">📋</span>
            <span className="text-sm font-medium">予約一覧</span>
            {(unreadReservations ?? 0) > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                {(unreadReservations ?? 0) > 99 ? "99+" : unreadReservations}
              </span>
            )}
          </Card>
        </Link>
        <Link href="/captain/fishing-report">
          <Card className="flex items-center gap-3 hover:shadow-md transition-shadow">
            <span className="text-2xl">🐟</span>
            <span className="text-sm font-medium">釣果投稿 / お知らせ</span>
          </Card>
        </Link>
        <Link href="/captain/calendar">
          <Card className="flex items-center gap-3 hover:shadow-md transition-shadow">
            <span className="text-2xl">📆</span>
            <span className="text-sm font-medium">カレンダー</span>
          </Card>
        </Link>
        <Link href="/captain/stats">
          <Card className="flex items-center gap-3 hover:shadow-md transition-shadow">
            <span className="text-2xl">📊</span>
            <span className="text-sm font-medium">統計</span>
          </Card>
        </Link>
        <Link href="/captain/trip-requests">
          <Card className="flex items-center gap-3 hover:shadow-md transition-shadow relative">
            <span className="text-2xl">🙋</span>
            <span className="text-sm font-medium">便リクエスト</span>
            {(pendingRequests ?? 0) > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                {pendingRequests}
              </span>
            )}
          </Card>
        </Link>
        <Link href="/captain/coupons">
          <Card className="flex items-center gap-3 hover:shadow-md transition-shadow">
            <span className="text-2xl">🎟️</span>
            <span className="text-sm font-medium">クーポン管理</span>
          </Card>
        </Link>
        <Link href="/captain/points">
          <Card className="flex items-center gap-3 hover:shadow-md transition-shadow relative">
            <span className="text-2xl">⭐</span>
            <span className="text-sm font-medium">ポイント管理</span>
            {(pendingRedemptions ?? 0) > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                {pendingRedemptions}
              </span>
            )}
          </Card>
        </Link>
        <Link href="/captain/tags">
          <Card className="flex items-center gap-3 hover:shadow-md transition-shadow">
            <span className="text-2xl">🏷️</span>
            <span className="text-sm font-medium">タグ管理</span>
          </Card>
        </Link>
        <Link href="/captain/manual">
          <Card className="flex items-center gap-3 hover:shadow-md transition-shadow col-span-2">
            <span className="text-2xl">📖</span>
            <span className="text-sm font-medium">使い方マニュアル</span>
          </Card>
        </Link>
      </div>

      {/* 新しい便を追加 */}
      <Link
        href="/captain/trips"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
      >
        <span className="text-base">＋</span>
        新しい便を追加
      </Link>

      {/* 手動予約入力 */}
      <ManualReservationForm trips={tripOptions} />
    </div>
  );
}

/**
 * /customer — customer ホーム画面
 */

import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { TripStatusBadge, ReservationStatusBadge } from "@/components/ui/StatusBadge";
import { todayJST, formatPrice, formatDateWithDay } from "@/lib/repositories/utils";
import type { Trip, TripRequest } from "@/types";

export default async function CustomerHomePage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();
  const today = todayJST();

  // 本日以降の open / confirmed 便（予約数も取得）
  const { data: upcomingTrips } = await supabase
    .from("trips")
    .select("*, boats(name), reservations(passengers_count, status)")
    .eq("account_id", session.accountId)
    .gte("trip_date", today)
    .in("status", ["open", "confirmed"])
    .order("trip_date", { ascending: true })
    .order("departure_time", { ascending: true })
    .limit(5);

  // 自分の顧客レコード（ポイント + id + 氏名 + 最終既読時刻）
  const { data: customer } = await supabase
    .from("customers")
    .select("id, points, full_name, last_read_reports_at")
    .eq("user_id", session.userId)
    .maybeSingle();

  // 未読の釣果・お知らせ件数
  const { count: unreadReports } = await supabase
    .from("message_logs")
    .select("id", { count: "exact", head: true })
    .eq("account_id", session.accountId)
    .in("message_type", ["fishing_report", "announcement"])
    .gt("sent_at", customer?.last_read_reports_at ?? "1970-01-01T00:00:00Z");

  // 表示名: LINE名を優先し、未設定の場合のみ customers.full_name を使用
  const displayName = session.displayName || customer?.full_name || null;

  // 自分の今後の予約（直近20件取得してJSで絞り込み）
  const { data: myReservationsRaw } = customer
    ? await supabase
        .from("reservations")
        .select(`
          id, reservation_code, status, passengers_count, discount_amount,
          trips(id, trip_date, departure_time, return_time, target_species, price_per_person, status, boats(name))
        `)
        .eq("customer_id", customer.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  type ResTrip = {
    id: string; trip_date: string; departure_time: string | null;
    return_time: string | null; target_species: string | null;
    price_per_person: number | null; status: string;
    boats?: { name: string } | { name: string }[] | null;
  };
  type ResRow = {
    id: string; reservation_code: string; status: string;
    passengers_count: number; discount_amount: number | null;
    trips: ResTrip | ResTrip[] | null;
  };

  const myReservations = ((myReservationsRaw ?? []) as ResRow[])
    .map((r) => ({ ...r, trip: Array.isArray(r.trips) ? r.trips[0] ?? null : r.trips }))
    .filter((r) => r.trip && r.trip.trip_date >= today && r.trip.status !== "cancelled")
    .sort((a, b) => (a.trip!.trip_date > b.trip!.trip_date ? 1 : -1))
    .slice(0, 5);

  // 自分のリクエスト一覧
  const { data: myRequests } = await supabase
    .from("trip_requests")
    .select("*")
    .eq("account_id", session.accountId)
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(5);

  // 船名 + フィーチャーフラグ
  const { data: account } = await supabase
    .from("accounts")
    .select("boat_name, name, feature_points, feature_coupon")
    .eq("id", session.accountId)
    .maybeSingle();

  // 自分が予約した便の出船通知（直近7日）
  const sevenDaysAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let departureNotices: Array<{
    trip_id: string;
    departure_judgement: string;
    cancel_reason: string | null;
    checked_at: string;
    trips: { trip_date: string; departure_time: string | null; target_species: string | null } | null;
  }> = [];

  if (customer) {
    const { data: custReservations } = await supabase
      .from("reservations")
      .select("trip_id, trips!inner(trip_date)")
      .eq("customer_id", customer.id)
      .neq("status", "cancelled")
      .gte("trips.trip_date", sevenDaysAgoDate);

    const myTripIds = [
      ...new Set(
        (custReservations ?? []).map((r) => r.trip_id).filter((id): id is string => !!id)
      ),
    ];

    if (myTripIds.length > 0) {
      const { data: checks } = await supabase
        .from("pre_departure_checks")
        .select("trip_id, departure_judgement, cancel_reason, checked_at, trips(trip_date, departure_time, target_species)")
        .in("trip_id", myTripIds)
        .gte("checked_at", sevenDaysAgoDate + "T00:00:00Z")
        .order("checked_at", { ascending: false })
        .limit(5);
      departureNotices = (checks ?? []).map((c) => ({
        ...c,
        trips: Array.isArray(c.trips) ? (c.trips[0] ?? null) : (c.trips as typeof departureNotices[number]["trips"]),
      })) as typeof departureNotices;
    }
  }

  const featurePoints = account?.feature_points ?? true;
  const featureCoupon = account?.feature_coupon ?? true;

  return (
    <div className="space-y-4">
      {/* ウェルカム */}
      <div className="pt-2">
        {(account?.boat_name || account?.name) && (
          <p className="text-xs font-medium text-brand-600 mb-0.5">
            🚢 {account.boat_name ?? account.name}
          </p>
        )}
        <h1 className="text-xl font-bold text-sea-dark">
          {displayName ?? "お客様"} さん
        </h1>
      </div>

      {/* 自分のリクエスト */}
      {(myRequests ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2">リクエスト状況</h2>
          <div className="space-y-2">
            {(myRequests as TripRequest[]).map((req) => {
              const stMap: Record<string, { label: string; className: string }> = {
                pending:  { label: "承認待ち", className: "bg-yellow-100 text-yellow-700" },
                approved: { label: "承認済み ✅", className: "bg-green-100 text-green-700" },
                rejected: { label: "お断り",   className: "bg-gray-100 text-gray-500" },
              };
              const st = stMap[req.status] ?? stMap.pending;
              return (
                <Card key={req.id}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{formatDateWithDay(req.requested_date)}</p>
                      {req.target_species && (
                        <p className="text-xs text-gray-500">{req.target_species}</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${st.className}`}>
                      {st.label}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* クイックアクション */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: "/customer/reservations", icon: "📅", label: "予約する",        badge: 0 },
          { href: "/customer/request",      icon: "🙋", label: "便をリクエスト",  badge: 0 },
          { href: "/customer/manifest",     icon: "📋", label: "乗船名簿",        badge: 0 },
          { href: "/customer/reports",      icon: "🐟", label: "釣果・お知らせ",  badge: unreadReports ?? 0 },
          ...(featureCoupon ? [{ href: "/customer/coupons", icon: "🎟️", label: "クーポン", badge: 0 }] : []),
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="flex flex-col items-center justify-center gap-2 h-24 text-center hover:shadow-md transition-shadow">
              <span className="text-3xl relative inline-block">
                {item.icon}
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-3 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </span>
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
            </Card>
          </Link>
        ))}

        {featurePoints && (
          <Link href="/customer/points">
            <Card className="flex flex-col items-center justify-center gap-2 h-24 text-center hover:shadow-md transition-shadow">
              <span className="text-3xl">⭐</span>
              <span className="text-sm font-medium text-gray-700">
                ポイント
                {customer?.points != null && (
                  <span className="text-brand-600 font-bold ml-1">
                    {customer.points.toLocaleString()} pt
                  </span>
                )}
              </span>
            </Card>
          </Link>
        )}
      </div>

      {/* 予約中の便 */}
      {myReservations.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2">予約中の便</h2>
          <div className="space-y-2">
            {myReservations.map((r) => {
              const trip = r.trip!;
              const boatName = Array.isArray(trip.boats)
                ? trip.boats[0]?.name ?? null
                : (trip.boats as { name: string } | null)?.name ?? null;
              const discountPer = r.discount_amount && r.passengers_count
                ? Math.round(r.discount_amount / r.passengers_count) : 0;
              const basePrice = trip.price_per_person;

              return (
                <Link key={r.id} href="/customer/reservations">
                  <Card className="hover:shadow-md transition-shadow active:scale-[0.99] border-l-4 border-l-brand-400">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ReservationStatusBadge status={r.status as "pending" | "confirmed" | "waitlist" | "cancelled" | "completed"} />
                          <span className="text-sm font-bold text-gray-800">
                            {trip.trip_date}
                            {trip.departure_time ? ` ${trip.departure_time.slice(0, 5)}〜` : ""}
                            {trip.return_time ? trip.return_time.slice(0, 5) : ""}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {boatName ?? "—"} / {trip.target_species ?? "—"} / {r.passengers_count}名
                        </p>
                        {basePrice != null && (
                          discountPer > 0 ? (
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-xs text-gray-400 line-through">
                                {formatPrice(basePrice)}/名
                              </span>
                              <span className="text-sm font-bold text-gray-800">
                                {formatPrice(basePrice - discountPer)}/名
                              </span>
                              <span className="text-xs bg-green-50 text-green-700 font-medium px-1.5 py-0.5 rounded-full">
                                🎟️ ¥{discountPer.toLocaleString()} OFF
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-600 mt-1 font-medium">
                              {formatPrice(basePrice)}/名
                            </p>
                          )
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          予約コード: {r.reservation_code}
                        </p>
                      </div>
                      <span className="text-gray-300 text-lg shrink-0">›</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 出船通知（自分の予約便のみ） */}
      {departureNotices.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2">出船通知</h2>
          <div className="space-y-2">
            {departureNotices.map((notice) => {
              const isGo = notice.departure_judgement === "go";
              const trip = notice.trips;
              const dateStr = trip
                ? `${trip.trip_date}${trip.departure_time ? " " + trip.departure_time.slice(0, 5) : ""}${trip.target_species ? " / " + trip.target_species : ""}`
                : "";
              return (
                <Card key={notice.trip_id}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{isGo ? "🚢" : "⚠️"}</span>
                    <div className="flex-1 min-w-0">
                      {dateStr && (
                        <p className="text-xs font-semibold text-gray-700 mb-0.5">{dateStr}</p>
                      )}
                      <p className="text-sm text-gray-800 font-medium">
                        {isGo ? "出船します" : "出船中止"}
                      </p>
                      {notice.cancel_reason && (
                        <p className="text-xs text-gray-500 mt-0.5">理由: {notice.cancel_reason}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notice.checked_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

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
            {upcomingTrips.map((trip: Trip & {
              boats?: { name: string } | null;
              reservations?: { passengers_count: number; status: string }[];
            }) => {
              const reservedCount = (trip.reservations ?? [])
                .filter((r) => r.status !== "cancelled")
                .reduce((sum, r) => sum + (r.passengers_count ?? 0), 0);
              const available = trip.capacity != null ? trip.capacity - reservedCount : null;

              return (
                <Link key={trip.id} href={`/customer/reservations?trip_id=${trip.id}`}>
                  <Card className="hover:shadow-md transition-shadow active:scale-[0.99]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">
                          {trip.trip_date}
                          {trip.departure_time ? ` ${trip.departure_time.slice(0, 5)}〜` : ""}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {trip.boats?.name ?? "—"} / {trip.target_species ?? "—"}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {trip.price_per_person != null && (
                            <span className="text-base font-bold text-gray-800">
                              {formatPrice(trip.price_per_person)}
                              <span className="text-xs font-normal text-gray-500">/名</span>
                            </span>
                          )}
                          {available != null && (
                            <span className={`text-xs font-medium ${available <= 0 ? "text-red-500" : "text-green-600"}`}>
                              {available <= 0 ? "満員" : `残り ${available} 名`}
                            </span>
                          )}
                        </div>
                        {trip.weather_note && (
                          <p className="text-xs text-gray-400 mt-1.5">{trip.weather_note}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <TripStatusBadge status={trip.status} />
                        <span className="text-gray-300 text-lg">›</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
            <Link
              href="/customer/schedules"
              className="flex items-center justify-center gap-1 w-full py-2.5 rounded-xl border border-brand-200 text-brand-600 text-sm font-medium hover:bg-brand-50 transition-colors"
            >
              出船情報をすべて見る →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

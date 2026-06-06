/**
 * /customer/reservations — 予約一覧 + 新規予約
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { ReservationStatusBadge } from "@/components/ui/StatusBadge";
import { ReservationForm, type TripCoupon } from "@/components/forms/ReservationForm";
import { formatPrice, todayJST } from "@/lib/repositories/utils";
import { isCouponValidForDate } from "@/lib/coupon-utils";
import type { Reservation, Trip, Coupon } from "@/types";

type ReservationWithTrip = Reservation & {
  trips: Pick<Trip, "trip_date" | "departure_time" | "target_species" | "status" | "price_per_person"> | null;
};

interface PageProps {
  searchParams?: { trip_id?: string };
}

export default async function CustomerReservationsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();
  const today = todayJST();
  const defaultTripId = searchParams?.trip_id;

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
        .select("*, trips(trip_date, departure_time, target_species, status, price_per_person)")
        .eq("customer_id", customer.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  // 受付中の便一覧（新規予約フォーム用）
  const { data: openTrips } = await supabase
    .from("trips")
    .select("id, trip_date, departure_time, target_species, capacity, price_per_person, boats(name)")
    .eq("account_id", session.accountId)
    .gte("trip_date", today)
    .in("status", ["open"])
    .order("trip_date", { ascending: true })
    .limit(20);

  // ユーザーの有効クーポンを取得
  const { data: userCouponsRaw } = await supabase
    .from("user_coupons")
    .select("id, coupons(id, title, discount_type, discount_value, date_restriction, specific_dates, valid_from, valid_to)")
    .eq("user_id", session.userId)
    .eq("status", "issued");

  // 各便にクーポンを適用できるか計算
  const couponMap: Record<string, TripCoupon> = {};
  for (const trip of openTrips ?? []) {
    if (trip.price_per_person == null) continue;
    for (const uc of userCouponsRaw ?? []) {
      const c = uc.coupons as unknown as Coupon & { id: string } | null;
      if (!c) continue;
      if (c.discount_type !== "amount" || !c.discount_value) continue;
      if (c.valid_to && c.valid_to < today) continue;
      if (!isCouponValidForDate(c, trip.trip_date)) continue;
      couponMap[trip.id] = {
        couponId: uc.id,
        title: c.title,
        discountValue: Math.min(c.discount_value, trip.price_per_person),
      };
      break;
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-gray-800">予約管理</h1>

      {/* 新規予約フォーム */}
      {openTrips && openTrips.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-600 mb-2">新しく予約する</h2>
          <ReservationForm
            trips={openTrips as unknown as Trip[]}
            defaultTripId={defaultTripId}
            couponMap={couponMap}
          />
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
            {(reservations as ReservationWithTrip[])
              .filter((r) => r.trips?.status !== "cancelled")
              .map((r) => (
                <Card key={r.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">
                        {r.trips?.trip_date ?? "—"}
                        {r.trips?.departure_time ? ` ${r.trips.departure_time}〜` : ""}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.trips?.target_species ?? "—"}
                      </p>
                      {r.trips?.price_per_person != null && (() => {
                        const base = r.trips!.price_per_person!;
                        const discountPer = r.discount_amount && r.passengers_count
                          ? Math.round(r.discount_amount / r.passengers_count) : 0;
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
                          <p className="text-sm font-semibold text-gray-800 mt-0.5">
                            {formatPrice(base)}
                            <span className="text-xs font-normal text-gray-500">/名</span>
                          </p>
                        );
                      })()}
                      <p className="text-xs text-gray-400 mt-1">
                        予約コード: {r.reservation_code}
                      </p>
                    </div>
                    {r.trips?.trip_date && r.trips.trip_date < today ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        終了
                      </span>
                    ) : (
                      <ReservationStatusBadge status={r.status} />
                    )}
                  </div>
                </Card>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * /customer/schedules — 出船情報
 * 今後の便一覧。クーポンが使えれば割引後価格を表示。
 * カードタップで予約ページへ遷移する。
 */

import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { TripStatusBadge } from "@/components/ui/StatusBadge";
import { todayJST, formatPrice, formatDateWithDay } from "@/lib/repositories/utils";
import { isCouponValidForDate } from "@/lib/coupon-utils";
import type { Trip, Coupon } from "@/types";

interface CouponRow {
  id: string;
  title: string;
  discount_type: string | null;
  discount_value: number | null;
  date_restriction: string;
  specific_dates: string | null;
  valid_from: string | null;
  valid_to: string | null;
}

interface TripDiscount {
  title: string;
  discountAmount: number;
}

export default async function CustomerSchedulesPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();
  const today = todayJST();

  const [{ data: trips }, { data: userCouponsRaw }] = await Promise.all([
    supabase
      .from("trips")
      .select("*, boats(name)")
      .eq("account_id", session.accountId)
      .gte("trip_date", today)
      .in("status", ["open", "full", "confirmed"])
      .order("trip_date", { ascending: true })
      .order("departure_time", { ascending: true })
      .limit(20),

    supabase
      .from("user_coupons")
      .select("id, coupons(id, title, discount_type, discount_value, date_restriction, specific_dates, valid_from, valid_to)")
      .eq("user_id", session.userId)
      .eq("status", "issued"),
  ]);

  // 有効なクーポンを絞り込む
  const activeCoupons: CouponRow[] = (userCouponsRaw ?? [])
    .map((uc) => {
      const c = uc.coupons as unknown as CouponRow | null;
      if (!c) return null;
      if (c.valid_to && c.valid_to < today) return null;
      return c;
    })
    .filter((c): c is CouponRow => c !== null);

  // 各便に適用できるクーポンを計算
  const discountMap: Record<string, TripDiscount> = {};
  for (const trip of trips ?? []) {
    if (trip.price_per_person == null) continue;
    for (const coupon of activeCoupons) {
      if (coupon.discount_type !== "amount" || !coupon.discount_value) continue;
      const applicable = isCouponValidForDate(coupon as unknown as Coupon, trip.trip_date);
      if (!applicable) continue;
      discountMap[trip.id] = {
        title: coupon.title,
        discountAmount: Math.min(coupon.discount_value, trip.price_per_person),
      };
      break;
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">出船情報</h1>

      {!trips || trips.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-8">
            現在、受付中の便はありません
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {trips.map((trip: Trip & { boats?: { name: string } | null }) => {
            const discount = discountMap[trip.id];
            const discountedPrice =
              discount && trip.price_per_person != null
                ? trip.price_per_person - discount.discountAmount
                : null;

            return (
              <Link key={trip.id} href={`/customer/reservations?trip_id=${trip.id}`}>
                <Card className="hover:shadow-md transition-shadow active:scale-[0.99]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TripStatusBadge status={trip.status} />
                        <span className="font-semibold text-sm">{formatDateWithDay(trip.trip_date)}</span>
                        {trip.departure_time && (
                          <span className="text-xs text-gray-500">
                            {trip.departure_time.slice(0, 5)}
                            {trip.return_time ? `〜${trip.return_time.slice(0, 5)}` : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {trip.boats?.name ?? "—"}
                        {trip.target_species ? ` ／ ${trip.target_species}` : ""}
                        {trip.capacity != null ? ` ／ 定員${trip.capacity}名` : ""}
                      </p>

                      {/* 価格表示 */}
                      {trip.price_per_person != null && (
                        <div className="mt-1.5">
                          {discount && discountedPrice != null ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-gray-400 text-xs line-through">
                                {formatPrice(trip.price_per_person)}
                              </span>
                              <span className="text-brand-600 font-bold text-base">
                                {formatPrice(discountedPrice)}
                                <span className="text-xs font-normal text-gray-500">/名</span>
                              </span>
                              <span className="text-xs bg-green-50 text-green-700 font-medium px-2 py-0.5 rounded-full">
                                🎟️ {formatPrice(discount.discountAmount)} OFF
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-800 font-semibold text-sm">
                              {formatPrice(trip.price_per_person)}
                              <span className="text-xs font-normal text-gray-500">/名</span>
                            </span>
                          )}
                        </div>
                      )}

                      {trip.weather_note && (
                        <p className="text-xs text-gray-400 mt-1.5 bg-gray-50 rounded p-2">
                          {trip.weather_note}
                        </p>
                      )}
                    </div>
                    <span className="text-gray-300 text-lg shrink-0">›</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

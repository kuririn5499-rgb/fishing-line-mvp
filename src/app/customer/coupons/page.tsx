/**
 * /customer/coupons — クーポン一覧
 * タップすると出船情報へ遷移し、クーポン割引が自動適用される
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { CouponClaimCard } from "@/components/ui/CouponClaimCard";

export default async function CustomerCouponsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from("user_coupons")
    .select("id, coupon_id, status, issued_at, used_at, coupons(title, discount_type, discount_value, date_restriction, valid_to)")
    .eq("user_id", session.userId)
    .order("issued_at", { ascending: false });

  const coupons = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">クーポン</h1>
      <p className="text-xs text-gray-400">
        タップすると出船情報でクーポン割引が自動的に適用されます
      </p>

      {coupons.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-6">
            現在、クーポンはありません
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {coupons.map((uc) => {
            const coupon = uc.coupons as unknown as {
              title: string;
              discount_type: string | null;
              discount_value: number | null;
              date_restriction: string;
              valid_to: string | null;
            } | null;
            if (!coupon) return null;

            return (
              <CouponClaimCard
                key={uc.id}
                userCouponId={uc.id}
                title={coupon.title}
                discountValue={coupon.discount_value}
                dateRestriction={coupon.date_restriction}
                validTo={coupon.valid_to}
                status={uc.status}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

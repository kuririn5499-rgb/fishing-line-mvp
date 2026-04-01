/**
 * /customer/coupons — クーポン一覧
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";

export default async function CustomerCouponsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from("user_coupons")
    .select("*, coupons(*)")
    .eq("user_id", session.userId)
    .order("issued_at", { ascending: false });

  const coupons = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">クーポン</h1>

      {coupons.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-6">
            現在、クーポンはありません
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {coupons.map((uc) => {
            const coupon = uc.coupons as {
              title: string;
              description: string | null;
              discount_type: string | null;
              discount_value: number | null;
              valid_to: string | null;
            } | null;
            if (!coupon) return null;

            const isUsed = uc.status === "used";
            const isExpired = uc.status === "expired";
            const expired =
              coupon.valid_to && new Date(coupon.valid_to) < new Date();

            return (
              <div
                key={uc.id}
                className={`
                  relative bg-white rounded-2xl border shadow-sm overflow-hidden
                  ${isUsed || isExpired || expired ? "opacity-50" : "border-brand-200"}
                `}
              >
                {/* 左側のアクセントライン */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isUsed || isExpired || expired
                      ? "bg-gray-300"
                      : "bg-brand-500"
                  }`}
                />
                <div className="pl-5 pr-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-gray-800">
                        {coupon.title}
                      </p>
                      {coupon.description && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {coupon.description}
                        </p>
                      )}
                      {coupon.discount_value != null && (
                        <p className="text-brand-600 font-bold text-lg mt-1">
                          {coupon.discount_type === "amount"
                            ? `¥${coupon.discount_value.toLocaleString()} OFF`
                            : coupon.discount_type === "percent"
                            ? `${coupon.discount_value}% OFF`
                            : coupon.discount_value}
                        </p>
                      )}
                      {coupon.valid_to && (
                        <p className="text-xs text-gray-400 mt-1">
                          有効期限: {new Date(coupon.valid_to).toLocaleDateString("ja-JP")}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isUsed
                          ? "bg-gray-100 text-gray-500"
                          : isExpired || expired
                          ? "bg-red-50 text-red-400"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {isUsed ? "使用済" : isExpired || expired ? "期限切れ" : "有効"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

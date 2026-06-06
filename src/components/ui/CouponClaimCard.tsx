"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DATE_RESTRICTION_LABELS } from "@/lib/coupon-utils";

interface Props {
  userCouponId: string;
  title: string;
  discountValue: number | null;
  dateRestriction: string;
  validTo: string | null;
  status: string;
}

export function CouponClaimCard({
  title,
  discountValue,
  dateRestriction,
  validTo,
  status,
}: Props) {
  const router = useRouter();
  const [claimed, setClaimed] = useState(false);

  const isUsable = status === "issued";
  const isExpired =
    status === "expired" ||
    (validTo ? new Date(validTo) < new Date() : false);

  const handleTap = () => {
    if (!isUsable || isExpired) return;
    setClaimed(true);
    setTimeout(() => router.push("/customer/schedules"), 1400);
  };

  return (
    <div
      onClick={handleTap}
      className={`relative bg-white rounded-2xl border shadow-sm overflow-hidden transition-all
        ${isUsable && !isExpired ? "cursor-pointer active:scale-95 border-brand-200" : "opacity-50 border-gray-100"}
        ${claimed ? "border-green-300 bg-green-50" : ""}
      `}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isUsable && !isExpired ? "bg-brand-500" : "bg-gray-300"}`} />

      <div className="pl-5 pr-4 py-4">
        {claimed ? (
          <div className="text-center py-2 space-y-1">
            <p className="text-2xl">🎟️</p>
            <p className="text-sm font-bold text-green-700">クーポンを獲得しました！</p>
            <p className="text-xs text-green-600">出船情報へ移動します...</p>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-sm text-gray-800">{title}</p>
              {discountValue != null && (
                <p className="text-brand-600 font-bold text-lg mt-1">
                  ¥{discountValue.toLocaleString()} OFF
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {DATE_RESTRICTION_LABELS[dateRestriction] ?? dateRestriction}
              </p>
              {validTo && (
                <p className="text-xs text-gray-400">
                  有効期限: {new Date(validTo).toLocaleDateString("ja-JP")}
                </p>
              )}
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0
              ${isExpired ? "bg-red-50 text-red-400" :
                status === "used" ? "bg-gray-100 text-gray-500" :
                "bg-green-100 text-green-700"}`}
            >
              {isExpired ? "期限切れ" : status === "used" ? "使用済" : "タップして使う"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

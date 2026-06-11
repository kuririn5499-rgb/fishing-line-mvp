/**
 * 予約作成フォーム（customer 用）
 */

"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { ReservationCreateSchema, type ReservationCreate } from "@/lib/schemas";
import { FormField, Select, Input } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import { formatPrice, formatDateWithDay } from "@/lib/repositories/utils";
import type { Trip } from "@/types";

export interface TripCoupon {
  couponId: string;
  title: string;
  discountValue: number; // 1名あたりの割引額
}

interface ReservationFormProps {
  trips: Trip[];
  defaultTripId?: string;
  couponMap?: Record<string, TripCoupon>; // trip_id → coupon info
}

export function ReservationForm({ trips, defaultTripId, couponMap }: ReservationFormProps) {
  const { toast, show, hide } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ReservationCreate>({
    resolver: zodResolver(ReservationCreateSchema),
    defaultValues: {
      trip_id: defaultTripId ?? "",
      passengers_count: 1,
    },
  });

  const selectedTripId = useWatch({ control, name: "trip_id" });
  const passengersCount = useWatch({ control, name: "passengers_count" }) ?? 1;
  const applicableCoupon = couponMap?.[selectedTripId ?? ""];
  const totalDiscount = applicableCoupon && couponApplied
    ? applicableCoupon.discountValue * Math.max(1, Number(passengersCount))
    : 0;

  // 便が変わったらクーポン適用をリセット
  useEffect(() => {
    setCouponApplied(false);
  }, [selectedTripId]);

  const selectedTrip = trips.find((t) => t.id === selectedTripId);

  const onSubmit = async (data: ReservationCreate) => {
    try {
      const body: ReservationCreate & { coupon_id?: string } = { ...data };
      if (applicableCoupon && couponApplied) {
        body.coupon_id = applicableCoupon.couponId;
      }

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "予約に失敗しました");

      show(`予約が完了しました（コード: ${json.reservation.reservation_code}）`, "success");
      setSubmitted(true);
      reset();
    } catch (err) {
      show(err instanceof Error ? err.message : "予約に失敗しました", "error");
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
        <p className="text-green-700 font-medium text-sm">✅ 予約が完了しました</p>
        <button
          className="text-xs text-green-600 underline mt-2"
          onClick={() => setSubmitted(false)}
        >
          続けて予約する
        </button>
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4"
      >
        {/* 便選択 */}
        <FormField label="便を選ぶ" error={errors.trip_id} required>
          <Select {...register("trip_id")} hasError={!!errors.trip_id}>
            <option value="">— 選択してください —</option>
            {trips.map((trip) => {
              const price = trip.price_per_person != null
                ? ` ${formatPrice(trip.price_per_person)}/名`
                : "";
              const planStr = trip.fishing_method ?? trip.target_species ?? "";
              const locStr = trip.location ? ` / ${trip.location}` : "";
              const label = `${formatDateWithDay(trip.trip_date)} ${trip.departure_time?.slice(0, 5) ?? ""} ${planStr}${locStr}${price}`;
              return (
                <option key={trip.id} value={trip.id}>
                  {label.trim()}
                </option>
              );
            })}
          </Select>
        </FormField>

        {/* 本名 */}
        <FormField label="お名前（本名）" error={errors.customer_name} required>
          <Input
            {...register("customer_name")}
            placeholder="山田 太郎"
            hasError={!!errors.customer_name}
          />
        </FormField>

        {/* 電話番号 */}
        <FormField label="電話番号" error={errors.customer_phone} required>
          <Input
            type="tel"
            {...register("customer_phone")}
            placeholder="090-0000-0000"
            hasError={!!errors.customer_phone}
          />
        </FormField>

        {/* 乗船人数 */}
        <FormField label="乗船人数" error={errors.passengers_count} required>
          <Input
            type="number"
            min={1}
            max={20}
            {...register("passengers_count")}
            hasError={!!errors.passengers_count}
          />
        </FormField>

        {/* クーポン */}
        {applicableCoupon && selectedTripId && (
          couponApplied ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="text-xl shrink-0">🎟️</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-green-800">{applicableCoupon.title}</p>
                <p className="text-xs text-green-700 mt-0.5">
                  {passengersCount > 1
                    ? `${Number(passengersCount)}名 × ¥${applicableCoupon.discountValue.toLocaleString()} = `
                    : ""}
                  <span className="font-bold">¥{totalDiscount.toLocaleString()} OFF</span> が適用されます
                </p>
                {selectedTrip?.price_per_person != null && (
                  <p className="text-xs text-green-600 mt-0.5">
                    合計: <span className="line-through text-gray-400">{formatPrice(selectedTrip.price_per_person * Number(passengersCount))}</span>
                    {" → "}
                    <span className="font-bold">{formatPrice(selectedTrip.price_per_person * Number(passengersCount) - totalDiscount)}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                className="text-xs text-gray-400 underline shrink-0"
                onClick={() => setCouponApplied(false)}
              >
                取消
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCouponApplied(true)}
              className="w-full border border-dashed border-green-400 rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:bg-green-50 transition-colors"
            >
              <span className="text-xl shrink-0">🎟️</span>
              <div>
                <p className="text-sm font-bold text-green-700">{applicableCoupon.title}</p>
                <p className="text-xs text-green-600">タップしてクーポンを適用する</p>
              </div>
            </button>
          )
        )}

        {/* メモ */}
        <FormField label="メモ（任意）" error={errors.memo}>
          <Input
            type="text"
            placeholder="特記事項があれば入力してください"
            {...register("memo")}
          />
        </FormField>

        <Button type="submit" loading={isSubmitting} className="w-full">
          {applicableCoupon && couponApplied ? "クーポン適用で予約する" : "予約する"}
        </Button>
      </form>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hide} />
      )}
    </>
  );
}

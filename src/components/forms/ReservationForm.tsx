/**
 * 予約作成フォーム（customer 用）
 * React Hook Form + Zod で型安全に実装する
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { ReservationCreateSchema, type ReservationCreate } from "@/lib/schemas";
import { FormField, Select, Input } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import type { Trip } from "@/types";

interface ReservationFormProps {
  trips: Trip[];
}

export function ReservationForm({ trips }: ReservationFormProps) {
  const { toast, show, hide } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReservationCreate>({
    resolver: zodResolver(ReservationCreateSchema),
    defaultValues: { passengers_count: 1 },
  });

  const onSubmit = async (data: ReservationCreate) => {
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
          <Select
            {...register("trip_id")}
            hasError={!!errors.trip_id}
          >
            <option value="">— 選択してください —</option>
            {trips.map((trip) => {
              const label = `${trip.trip_date} ${trip.departure_time ?? ""} ${trip.target_species ?? ""}`;
              return (
                <option key={trip.id} value={trip.id}>
                  {label.trim()}
                </option>
              );
            })}
          </Select>
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

        {/* メモ */}
        <FormField label="メモ（任意）" error={errors.memo}>
          <Input
            type="text"
            placeholder="特記事項があれば入力してください"
            {...register("memo")}
          />
        </FormField>

        <Button type="submit" loading={isSubmitting} className="w-full">
          予約する
        </Button>
      </form>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hide} />
      )}
    </>
  );
}

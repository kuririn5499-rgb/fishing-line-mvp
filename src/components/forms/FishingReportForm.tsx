/**
 * 釣果投稿フォーム（captain 用）
 * 投稿内容を LINE Broadcast で配信する
 */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";

const FishingReportSchema = z.object({
  trip_id: z.string().uuid("便を選択してください"),
  catch_summary: z.string().min(1, "釣果内容を入力してください").max(500),
  has_vacancy: z.boolean(),
});

type FishingReportFormData = z.infer<typeof FishingReportSchema>;

interface FishingReportFormProps {
  trips: {
    id: string;
    trip_date: string;
    departure_time: string | null;
    target_species: string | null;
    boats?: { name: string } | null;
  }[];
  boatName: string;
}

export function FishingReportForm({ trips, boatName }: FishingReportFormProps) {
  const { toast, show, hide } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FishingReportFormData>({
    resolver: zodResolver(FishingReportSchema),
    defaultValues: {
      trip_id: trips[0]?.id ?? "",
      has_vacancy: false,
    },
  });

  const hasVacancy = watch("has_vacancy");

  const onSubmit = async (data: FishingReportFormData) => {
    try {
      const res = await fetch("/api/fishing-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "配信に失敗しました");
      show("釣果を配信しました", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "配信に失敗しました", "error");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <FormField label="対象の便" error={errors.trip_id} required>
            <Select {...register("trip_id")} hasError={!!errors.trip_id}>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.trip_date} {t.departure_time ?? ""} {t.boats?.name ?? ""}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="釣果内容" error={errors.catch_summary} required>
            <textarea
              {...register("catch_summary")}
              rows={4}
              placeholder="マダイ 5匹（最大 60cm）、ブリ 2匹など"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </FormField>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasVacancy}
              onChange={(e) => setValue("has_vacancy", e.target.checked)}
              className="w-5 h-5 rounded text-brand-600 border-gray-300 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">
              🎣 空席あり（次回予約の誘導メッセージを追加）
            </span>
          </label>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <p className="text-xs text-blue-700">
            📢 投稿すると LINE 公式アカウントの全フォロワーへ通知されます
          </p>
        </div>

        <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
          釣果を配信する
        </Button>
      </form>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hide} />
      )}
    </>
  );
}

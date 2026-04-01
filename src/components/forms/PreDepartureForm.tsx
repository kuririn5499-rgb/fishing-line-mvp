/**
 * 出船前検査フォーム（captain 用）
 * チェック項目・出船可否判定を入力する
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import {
  PreDepartureCheckSchema,
  type PreDepartureCheckForm,
} from "@/lib/schemas";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { CheckboxField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import type { Trip, Boat, PreDepartureCheck } from "@/types";

interface PreDepartureFormProps {
  trips: (Trip & { boats?: Boat | null })[];
  selectedTripId: string;
  existingCheck: PreDepartureCheck | null;
}

/** チェック項目リスト */
const CHECK_ITEMS: { name: keyof PreDepartureCheckForm; label: string }[] = [
  { name: "fuel_checked", label: "燃料確認" },
  { name: "battery_checked", label: "バッテリー確認" },
  { name: "engine_checked", label: "エンジン確認" },
  { name: "bilge_checked", label: "ビルジ確認" },
  { name: "radio_checked", label: "無線設備確認" },
  { name: "life_saving_equipment_checked", label: "救命設備確認" },
  { name: "crew_condition_checked", label: "乗組員体調確認" },
  { name: "alcohol_checked", label: "飲酒確認（アルコール検知）" },
];

export function PreDepartureForm({
  trips,
  selectedTripId,
  existingCheck,
}: PreDepartureFormProps) {
  const { toast, show, hide } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PreDepartureCheckForm>({
    resolver: zodResolver(PreDepartureCheckSchema),
    defaultValues: {
      trip_id: selectedTripId,
      fuel_checked: existingCheck?.fuel_checked ?? false,
      battery_checked: existingCheck?.battery_checked ?? false,
      engine_checked: existingCheck?.engine_checked ?? false,
      bilge_checked: existingCheck?.bilge_checked ?? false,
      radio_checked: existingCheck?.radio_checked ?? false,
      life_saving_equipment_checked:
        existingCheck?.life_saving_equipment_checked ?? false,
      crew_condition_checked: existingCheck?.crew_condition_checked ?? false,
      alcohol_checked: existingCheck?.alcohol_checked ?? false,
      departure_judgement: existingCheck?.departure_judgement ?? "go",
      weather: existingCheck?.weather ?? "",
      wind: existingCheck?.wind ?? "",
      wave: existingCheck?.wave ?? "",
      visibility: existingCheck?.visibility ?? "",
      cancel_reason: existingCheck?.cancel_reason ?? "",
      notes: existingCheck?.notes ?? "",
    },
  });

  const departure_judgement = watch("departure_judgement");

  // 既存データが変わった時にリセット
  useEffect(() => {
    if (existingCheck) {
      reset({
        trip_id: selectedTripId,
        fuel_checked: existingCheck.fuel_checked,
        battery_checked: existingCheck.battery_checked,
        engine_checked: existingCheck.engine_checked,
        bilge_checked: existingCheck.bilge_checked,
        radio_checked: existingCheck.radio_checked,
        life_saving_equipment_checked: existingCheck.life_saving_equipment_checked,
        crew_condition_checked: existingCheck.crew_condition_checked,
        alcohol_checked: existingCheck.alcohol_checked,
        departure_judgement: existingCheck.departure_judgement ?? "go",
        weather: existingCheck.weather ?? "",
        wind: existingCheck.wind ?? "",
        wave: existingCheck.wave ?? "",
        visibility: existingCheck.visibility ?? "",
        cancel_reason: existingCheck.cancel_reason ?? "",
        notes: existingCheck.notes ?? "",
      });
    }
  }, [existingCheck, selectedTripId, reset]);

  const onSubmit = async (data: PreDepartureCheckForm) => {
    try {
      const res = await fetch("/api/pre-departure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "保存に失敗しました");
      show("出船前検査を保存しました", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "保存に失敗しました", "error");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* 便選択 */}
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
        </div>

        {/* 気象条件 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">気象条件</h2>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="天気" error={errors.weather}>
              <Input {...register("weather")} placeholder="晴れ" />
            </FormField>
            <FormField label="風" error={errors.wind}>
              <Input {...register("wind")} placeholder="北東 3m/s" />
            </FormField>
            <FormField label="波" error={errors.wave}>
              <Input {...register("wave")} placeholder="0.5m" />
            </FormField>
            <FormField label="視界" error={errors.visibility}>
              <Input {...register("visibility")} placeholder="良好" />
            </FormField>
          </div>
        </div>

        {/* チェック項目 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">安全確認チェック</h2>
          {CHECK_ITEMS.map((item) => (
            <CheckboxField
              key={item.name}
              label={item.label}
              checked={watch(item.name) as boolean}
              onChange={(v) => setValue(item.name, v)}
            />
          ))}
        </div>

        {/* 出船可否 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">出船判断</h2>
          <FormField label="出船判断" error={errors.departure_judgement} required>
            <Select
              {...register("departure_judgement")}
              hasError={!!errors.departure_judgement}
            >
              <option value="go">✅ 出船する</option>
              <option value="hold">⏳ 保留（再判断）</option>
              <option value="cancel">❌ 出船中止</option>
            </Select>
          </FormField>

          {(departure_judgement === "cancel" || departure_judgement === "hold") && (
            <FormField label="中止・保留の理由" error={errors.cancel_reason}>
              <Input
                {...register("cancel_reason")}
                placeholder="強風のため など"
              />
            </FormField>
          )}
        </div>

        {/* 備考 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <FormField label="備考" error={errors.notes}>
            <textarea
              {...register("notes")}
              rows={3}
              placeholder="特記事項があれば入力"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </FormField>
        </div>

        <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
          出船前検査を保存
        </Button>
      </form>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hide} />
      )}
    </>
  );
}

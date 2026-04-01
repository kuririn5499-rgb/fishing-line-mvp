/**
 * 乗務記録フォーム（captain 用）
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { DutyLogSchema, type DutyLogForm as DutyLogFormType } from "@/lib/schemas";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import type { Trip, Boat, DutyLog } from "@/types";

interface DutyLogFormProps {
  trips: (Trip & { boats?: Boat | null })[];
  selectedTripId: string;
  existingLog: DutyLog | null;
}

export function DutyLogForm({
  trips,
  selectedTripId,
  existingLog,
}: DutyLogFormProps) {
  const { toast, show, hide } = useToast();

  const toDatetimeLocal = (iso: string | null | undefined) => {
    if (!iso) return "";
    // ISO → datetime-local 形式（ブラウザ入力用）
    return iso.slice(0, 16);
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DutyLogFormType>({
    resolver: zodResolver(DutyLogSchema),
    defaultValues: {
      trip_id: selectedTripId,
      departure_at: toDatetimeLocal(existingLog?.departure_at),
      return_at: toDatetimeLocal(existingLog?.return_at),
      passenger_count: existingLog?.passenger_count ?? undefined,
      fishing_area: existingLog?.fishing_area ?? "",
      weather: existingLog?.weather ?? "",
      sea_condition: existingLog?.sea_condition ?? "",
      safety_guidance: existingLog?.safety_guidance ?? "",
      incident_report: existingLog?.incident_report ?? "",
      catch_summary: existingLog?.catch_summary ?? "",
      notes: existingLog?.notes ?? "",
    },
  });

  useEffect(() => {
    reset({
      trip_id: selectedTripId,
      departure_at: toDatetimeLocal(existingLog?.departure_at),
      return_at: toDatetimeLocal(existingLog?.return_at),
      passenger_count: existingLog?.passenger_count ?? undefined,
      fishing_area: existingLog?.fishing_area ?? "",
      weather: existingLog?.weather ?? "",
      sea_condition: existingLog?.sea_condition ?? "",
      safety_guidance: existingLog?.safety_guidance ?? "",
      incident_report: existingLog?.incident_report ?? "",
      catch_summary: existingLog?.catch_summary ?? "",
      notes: existingLog?.notes ?? "",
    });
  }, [existingLog, selectedTripId, reset]);

  const onSubmit = async (data: DutyLogFormType) => {
    // datetime-local → ISO string に変換
    const payload = {
      ...data,
      departure_at: data.departure_at
        ? new Date(data.departure_at).toISOString()
        : undefined,
      return_at: data.return_at
        ? new Date(data.return_at).toISOString()
        : undefined,
    };

    try {
      const res = await fetch("/api/duty-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "保存に失敗しました");
      show("乗務記録を保存しました", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "保存に失敗しました", "error");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* 便選択 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <FormField label="対象の便" error={errors.trip_id} required>
            <Select {...register("trip_id")}>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.trip_date} {t.departure_time ?? ""} {t.boats?.name ?? ""}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        {/* 出入港時刻・乗客数 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">出入港情報</h2>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="出港時刻" error={errors.departure_at}>
              <Input type="datetime-local" {...register("departure_at")} />
            </FormField>
            <FormField label="帰港時刻" error={errors.return_at}>
              <Input type="datetime-local" {...register("return_at")} />
            </FormField>
          </div>
          <FormField label="乗船者数" error={errors.passenger_count}>
            <Input
              type="number"
              min={0}
              max={200}
              {...register("passenger_count")}
              placeholder="0"
            />
          </FormField>
          <FormField label="釣り場所" error={errors.fishing_area}>
            <Input {...register("fishing_area")} placeholder="○○沖" />
          </FormField>
        </div>

        {/* 気象・海況 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">気象・海況</h2>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="天気" error={errors.weather}>
              <Input {...register("weather")} placeholder="晴れ" />
            </FormField>
            <FormField label="海況" error={errors.sea_condition}>
              <Input {...register("sea_condition")} placeholder="良好" />
            </FormField>
          </div>
        </div>

        {/* 安全・釣果・特記 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">記録</h2>

          <FormField label="安全指導内容" error={errors.safety_guidance}>
            <textarea
              {...register("safety_guidance")}
              rows={2}
              placeholder="ライフジャケット着用指示 など"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </FormField>

          <FormField label="釣果" error={errors.catch_summary}>
            <textarea
              {...register("catch_summary")}
              rows={2}
              placeholder="マダイ 5匹、ブリ 2匹 など"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </FormField>

          <FormField label="事故・ヒヤリハット" error={errors.incident_report}>
            <textarea
              {...register("incident_report")}
              rows={2}
              placeholder="特になし（事故があれば詳細を記録）"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </FormField>

          <FormField label="備考" error={errors.notes}>
            <textarea
              {...register("notes")}
              rows={2}
              placeholder="その他特記事項"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </FormField>
        </div>

        <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
          乗務記録を保存
        </Button>
      </form>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hide} />
      )}
    </>
  );
}

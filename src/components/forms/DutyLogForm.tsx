/**
 * 乗務記録フォーム（captain 用）
 * 国土交通省準拠の乗務記録
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
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

const TA_CLASS =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500";

export function DutyLogForm({ trips, selectedTripId, existingLog }: DutyLogFormProps) {
  const { toast, show, hide } = useToast();
  const router = useRouter();

  const toDatetimeLocal = (iso: string | null | undefined) =>
    iso ? iso.slice(0, 16) : "";

  const buildDefaults = (log: DutyLog | null, tripId: string): DutyLogFormType => ({
    trip_id: tripId,
    departure_at: toDatetimeLocal(log?.departure_at),
    return_at: toDatetimeLocal(log?.return_at),
    departure_location: log?.departure_location ?? "",
    arrival_location: log?.arrival_location ?? "",
    captain_name: log?.captain_name ?? "",
    passenger_count: log?.passenger_count ?? undefined,
    weather: log?.weather ?? "",
    fishing_area: log?.fishing_area ?? "",
    catch_summary: log?.catch_summary ?? "",
    incident_report: log?.incident_report ?? "",
    emergency_contact_log: log?.emergency_contact_log ?? "",
    operator_opinion: log?.operator_opinion ?? "",
    notes: log?.notes ?? "",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DutyLogFormType>({
    resolver: zodResolver(DutyLogSchema),
    defaultValues: buildDefaults(existingLog, selectedTripId),
  });

  useEffect(() => {
    reset(buildDefaults(existingLog, selectedTripId));
  }, [existingLog, selectedTripId, reset]);

  const onSubmit = async (data: DutyLogFormType) => {
    const payload = {
      ...data,
      departure_at: data.departure_at ? new Date(data.departure_at).toISOString() : undefined,
      return_at: data.return_at ? new Date(data.return_at).toISOString() : undefined,
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
      setTimeout(() => router.push("/captain"), 800);
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
            <Select
              {...register("trip_id")}
              onChange={(e) => {
                router.push(`/captain/duty-log?trip_id=${e.target.value}`);
              }}
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.trip_date}
                  {t.departure_time ? ` ${t.departure_time.slice(0, 5)}〜` : ""}
                  {t.boats?.name ? ` ${t.boats.name}` : ""}
                  {t.target_species ? ` / ${t.target_species}` : ""}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        {/* 日時・場所 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">日時・場所</h2>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="開始時刻" error={errors.departure_at} required>
              <Input type="datetime-local" {...register("departure_at")} />
            </FormField>
            <FormField label="終了時刻" error={errors.return_at} required>
              <Input type="datetime-local" {...register("return_at")} />
            </FormField>
            <FormField label="開始場所" error={errors.departure_location} required>
              <Input {...register("departure_location")} placeholder="長崎港" />
            </FormField>
            <FormField label="終了場所" error={errors.arrival_location} required>
              <Input {...register("arrival_location")} placeholder="長崎港" />
            </FormField>
          </div>
        </div>

        {/* 船長・船舶情報 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">船長・船舶情報</h2>
          <FormField label="船長の氏名" error={errors.captain_name} required>
            <Input {...register("captain_name")} placeholder="山田太郎" />
          </FormField>
          <div className="text-xs text-gray-400">
            遊漁船の名称:{" "}
            {trips.find((t) => t.id === selectedTripId)?.boats?.name ?? "—"}
            　出船日:{" "}
            {trips.find((t) => t.id === selectedTripId)?.trip_date ?? "—"}
          </div>
        </div>

        {/* 気象・海象 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">気象及び海象等の状況</h2>
          <FormField label="" error={errors.weather} required>
            <textarea
              {...register("weather")}
              rows={3}
              placeholder="天気・風・波・視界など"
              className={TA_CLASS}
            />
          </FormField>
        </div>

        {/* 漁場・利用者 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">漁場・利用者</h2>
          <FormField label="案内した漁場の位置" error={errors.fishing_area} required>
            <Input {...register("fishing_area")} placeholder="○○沖 / 北緯○○ 東経○○" />
          </FormField>
          <FormField label="利用者の数" error={errors.passenger_count} required>
            <Input type="number" min={0} max={200} {...register("passenger_count")} placeholder="0" />
          </FormField>
          <FormField label="利用者が採捕した水産動植物" error={errors.catch_summary} required>
            <textarea
              {...register("catch_summary")}
              rows={2}
              placeholder="マダイ 5匹、ブリ 2匹 など"
              className={TA_CLASS}
            />
          </FormField>
        </div>

        {/* 事故・異常事態 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">事故・異常事態</h2>
          <FormField label="重大な事故又は海難その他の異常事態（概要及び原因）" error={errors.incident_report}>
            <textarea
              {...register("incident_report")}
              rows={3}
              placeholder="なし（事故があれば詳細を記録）"
              className={TA_CLASS}
            />
          </FormField>
          <FormField label="気象悪化・異常事態時の連絡責任者への連絡内容" error={errors.emergency_contact_log}>
            <textarea
              {...register("emergency_contact_log")}
              rows={2}
              placeholder="なし"
              className={TA_CLASS}
            />
          </FormField>
        </div>

        {/* 意見・備考 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">意見・備考</h2>
          <FormField label="出航判断・利用者安全・漁場利用に関する意見" error={errors.operator_opinion}>
            <textarea
              {...register("operator_opinion")}
              rows={2}
              placeholder="なし"
              className={TA_CLASS}
            />
          </FormField>
          <FormField label="その他" error={errors.notes}>
            <textarea
              {...register("notes")}
              rows={2}
              placeholder="特記事項があれば入力"
              className={TA_CLASS}
            />
          </FormField>
        </div>

        <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
          乗務記録を保存
        </Button>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}

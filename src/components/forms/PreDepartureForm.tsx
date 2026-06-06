/**
 * 出船前検査フォーム（captain 用）
 * 国土交通省準拠の安全確認チェックリスト
 * デフォルトで全項目チェック済み・ワンボタン送信
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PreDepartureCheckSchema,
  type PreDepartureCheckForm,
} from "@/lib/schemas";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { CheckboxField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import type { Trip, Boat, PreDepartureCheck } from "@/types";

interface PreDepartureFormProps {
  trips: (Trip & { boats?: Boat | null })[];
  selectedTripId: string;
  existingCheck: PreDepartureCheck | null;
}

/** チェック項目（Google フォーム準拠） */
const CHECK_ITEMS: { name: keyof PreDepartureCheckForm; label: string }[] = [
  { name: "hull_checked", label: "船体に亀裂や破口はないか" },
  { name: "bilge_checked", label: "エンジンルームや船底のビルジの量は普段より多くないか" },
  { name: "fuel_checked", label: "航海計画に見合った燃料は十分にあるか" },
  { name: "fuel_valve_checked", label: "燃料コック（バルブ）は開いているか、燃料フィルター・セジメンターにゴミや水分の混入はないか" },
  { name: "engine_oil_checked", label: "エンジンオイル（潤滑油）の量は十分か" },
  { name: "coolant_checked", label: "冷却清水の量は十分か" },
  { name: "battery_checked", label: "バッテリーの液量は十分か、ターミナルは締め付けられているか、耐用年数は切れていないか" },
  { name: "life_saving_equipment_checked", label: "救命胴衣を着用したか、利用者に救命胴衣を着用させたか" },
  { name: "radio_checked", label: "通信手段の充電量・予備バッテリーを確認したか" },
  { name: "equipment_compliance_checked", label: "国土交通省が定める要件に適合した通信設備及び救命設備を搭載しているか" },
  { name: "rescue_ladder_checked", label: "落水救助者用の梯子は使用可能か" },
  { name: "landing_steps_checked", label: "瀬渡しの際に使用するステップ等は搭載しているか" },
  { name: "fishing_gear_checked", label: "釣具・漁具等が安全な状態に設置・格納されているか" },
  { name: "gauges_checked", label: "回転計・冷却水温度計・油圧計・電流計・電圧計は正常値を指しているか" },
  { name: "cooling_water_checked", label: "冷却用の海水は通常どおりの量や勢いで排出されているか" },
  { name: "engine_checked", label: "エンジンから異常な音やにおいは出ていないか" },
];

const ALCOHOL_ITEMS: { name: keyof PreDepartureCheckForm; label: string }[] = [
  { name: "alcohol_checked", label: "酒気帯びなし（アルコール検査済み）" },
  { name: "crew_condition_checked", label: "業務の実行可（健康状態良好）" },
];

export function PreDepartureForm({
  trips,
  selectedTripId,
  existingCheck,
}: PreDepartureFormProps) {
  const { toast, show, hide } = useToast();
  const router = useRouter();

  const defaultValues: PreDepartureCheckForm = {
    trip_id: selectedTripId,
    hull_checked: existingCheck?.hull_checked ?? true,
    bilge_checked: existingCheck?.bilge_checked ?? true,
    fuel_checked: existingCheck?.fuel_checked ?? true,
    fuel_valve_checked: existingCheck?.fuel_valve_checked ?? true,
    engine_oil_checked: existingCheck?.engine_oil_checked ?? true,
    coolant_checked: existingCheck?.coolant_checked ?? true,
    battery_checked: existingCheck?.battery_checked ?? true,
    life_saving_equipment_checked: existingCheck?.life_saving_equipment_checked ?? true,
    radio_checked: existingCheck?.radio_checked ?? true,
    equipment_compliance_checked: existingCheck?.equipment_compliance_checked ?? true,
    rescue_ladder_checked: existingCheck?.rescue_ladder_checked ?? true,
    landing_steps_checked: existingCheck?.landing_steps_checked ?? true,
    fishing_gear_checked: existingCheck?.fishing_gear_checked ?? true,
    gauges_checked: existingCheck?.gauges_checked ?? true,
    cooling_water_checked: existingCheck?.cooling_water_checked ?? true,
    engine_checked: existingCheck?.engine_checked ?? true,
    alcohol_checked: existingCheck?.alcohol_checked ?? true,
    crew_condition_checked: existingCheck?.crew_condition_checked ?? true,
    issue_notes: existingCheck?.issue_notes ?? "",
    inspector_name: existingCheck?.inspector_name ?? "",
    inspection_location: existingCheck?.inspection_location ?? "",
    alcohol_test_value: existingCheck?.alcohol_test_value ?? "",
    notes: existingCheck?.notes ?? "",
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PreDepartureCheckForm>({
    resolver: zodResolver(PreDepartureCheckSchema),
    defaultValues,
  });

  useEffect(() => {
    if (existingCheck) {
      reset({
        trip_id: selectedTripId,
        hull_checked: existingCheck.hull_checked,
        bilge_checked: existingCheck.bilge_checked,
        fuel_checked: existingCheck.fuel_checked,
        fuel_valve_checked: existingCheck.fuel_valve_checked,
        engine_oil_checked: existingCheck.engine_oil_checked,
        coolant_checked: existingCheck.coolant_checked,
        battery_checked: existingCheck.battery_checked,
        life_saving_equipment_checked: existingCheck.life_saving_equipment_checked,
        radio_checked: existingCheck.radio_checked,
        equipment_compliance_checked: existingCheck.equipment_compliance_checked,
        rescue_ladder_checked: existingCheck.rescue_ladder_checked,
        landing_steps_checked: existingCheck.landing_steps_checked,
        fishing_gear_checked: existingCheck.fishing_gear_checked,
        gauges_checked: existingCheck.gauges_checked,
        cooling_water_checked: existingCheck.cooling_water_checked,
        engine_checked: existingCheck.engine_checked,
        alcohol_checked: existingCheck.alcohol_checked,
        crew_condition_checked: existingCheck.crew_condition_checked,
        issue_notes: existingCheck.issue_notes ?? "",
        inspector_name: existingCheck.inspector_name ?? "",
        inspection_location: existingCheck.inspection_location ?? "",
        alcohol_test_value: existingCheck.alcohol_test_value ?? "",
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
      // ダッシュボードに戻ってアラートを更新
      setTimeout(() => router.push("/captain"), 800);
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

        {/* 安全確認チェック */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">安全確認チェック</h2>
          <p className="text-xs text-gray-400">問題がある項目のチェックを外してください</p>
          {CHECK_ITEMS.map((item) => (
            <CheckboxField
              key={item.name}
              label={item.label}
              checked={watch(item.name) as boolean}
              onChange={(v) => setValue(item.name, v)}
            />
          ))}
          <FormField label="問題がある場合は記入" error={errors.issue_notes}>
            <Input {...register("issue_notes")} placeholder="異常があった場合に記入" />
          </FormField>
        </div>

        {/* アルコール・健康確認 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">酒気帯び・健康確認</h2>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="氏名" error={errors.inspector_name}>
              <Input {...register("inspector_name")} placeholder="山田太郎" />
            </FormField>
            <FormField label="検査場所" error={errors.inspection_location}>
              <Input {...register("inspection_location")} placeholder="長崎港" />
            </FormField>
          </div>
          <FormField label="アルコール検査結果（数値）" error={errors.alcohol_test_value}>
            <Input {...register("alcohol_test_value")} placeholder="0.00" />
          </FormField>
          {ALCOHOL_ITEMS.map((item) => (
            <CheckboxField
              key={item.name}
              label={item.label}
              checked={watch(item.name) as boolean}
              onChange={(v) => setValue(item.name, v)}
            />
          ))}
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

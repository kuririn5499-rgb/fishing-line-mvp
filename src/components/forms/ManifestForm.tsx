/**
 * 乗船名簿フォーム（customer 用）
 * 同行者入力対応・前回情報を初期値として表示する
 */

"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ManifestSubmitSchema, type ManifestSubmit } from "@/lib/schemas";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { CheckboxField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import type { Reservation, BoardingManifest } from "@/types";

interface ManifestFormProps {
  reservations: Reservation[];
  defaultValues: BoardingManifest | null;
}

export function ManifestForm({ reservations, defaultValues }: ManifestFormProps) {
  const { toast, show, hide } = useToast();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ManifestSubmit>({
    resolver: zodResolver(ManifestSubmitSchema),
    defaultValues: {
      reservation_id: "",
      full_name: defaultValues?.full_name ?? "",
      phone: defaultValues?.phone ?? "",
      address: defaultValues?.address ?? "",
      emergency_name: defaultValues?.emergency_name ?? "",
      emergency_phone: defaultValues?.emergency_phone ?? "",
      life_jacket_owned: defaultValues?.life_jacket_owned ?? false,
      rental_required: defaultValues?.rental_required ?? false,
      companions: [],
      notes: defaultValues?.notes ?? "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "companions",
  });

  const lifeJacketOwned = watch("life_jacket_owned");
  const rentalRequired = watch("rental_required");

  const onSubmit = async (data: ManifestSubmit) => {
    try {
      const res = await fetch("/api/manifests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "提出に失敗しました");
      show("乗船名簿を提出しました", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "提出に失敗しました", "error");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* 予約選択 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">予約を選択</h2>
          <FormField label="予約" error={errors.reservation_id} required>
            <Select {...register("reservation_id")} hasError={!!errors.reservation_id}>
              <option value="">— 選択してください —</option>
              {reservations.map((r) => (
                <option key={r.id} value={r.id}>
                  {(r as unknown as { trips?: { trip_date?: string } }).trips?.trip_date ?? ""}{" "}
                  予約コード: {r.reservation_code}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        {/* 代表者情報 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">代表者情報</h2>

          <FormField label="氏名" error={errors.full_name} required>
            <Input {...register("full_name")} hasError={!!errors.full_name} placeholder="山田 太郎" />
          </FormField>

          <FormField label="電話番号" error={errors.phone} required>
            <Input {...register("phone")} hasError={!!errors.phone} type="tel" placeholder="090-0000-0000" />
          </FormField>

          <FormField label="住所" error={errors.address} required>
            <Input {...register("address")} hasError={!!errors.address} placeholder="東京都○○区..." />
          </FormField>

          <FormField label="緊急連絡先 氏名" error={errors.emergency_name} required>
            <Input {...register("emergency_name")} hasError={!!errors.emergency_name} placeholder="山田 花子" />
          </FormField>

          <FormField label="緊急連絡先 電話番号" error={errors.emergency_phone} required>
            <Input {...register("emergency_phone")} hasError={!!errors.emergency_phone} type="tel" placeholder="080-0000-0000" />
          </FormField>

          <CheckboxField
            label="救命胴衣を持参する"
            checked={lifeJacketOwned}
            onChange={(v) => setValue("life_jacket_owned", v)}
          />
          <CheckboxField
            label="救命胴衣のレンタルが必要"
            checked={rentalRequired}
            onChange={(v) => setValue("rental_required", v)}
          />
        </div>

        {/* 同行者 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">同行者（任意）</h2>
            <button
              type="button"
              onClick={() =>
                append({
                  full_name: "",
                  phone: "",
                  life_jacket_owned: false,
                  rental_required: false,
                })
              }
              className="text-xs text-brand-600 font-medium"
            >
              ＋ 同行者を追加
            </button>
          </div>

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="border border-gray-100 rounded-xl p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">
                  同行者 {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-xs text-red-500"
                >
                  削除
                </button>
              </div>
              <FormField
                label="氏名"
                error={errors.companions?.[index]?.full_name}
                required
              >
                <Input
                  {...register(`companions.${index}.full_name`)}
                  placeholder="山田 次郎"
                />
              </FormField>
              <FormField
                label="電話番号（任意）"
                error={errors.companions?.[index]?.phone}
              >
                <Input
                  {...register(`companions.${index}.phone`)}
                  type="tel"
                  placeholder="090-0000-0000"
                />
              </FormField>
            </div>
          ))}
        </div>

        {/* メモ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <FormField label="備考（任意）" error={errors.notes}>
            <textarea
              {...register("notes")}
              rows={3}
              placeholder="船酔いしやすい、車椅子対応など"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </FormField>
        </div>

        <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
          名簿を提出する
        </Button>
      </form>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hide} />
      )}
    </>
  );
}

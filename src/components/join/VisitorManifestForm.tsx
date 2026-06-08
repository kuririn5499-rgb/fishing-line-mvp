"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VisitorManifestSchema, type VisitorManifest } from "@/lib/schemas";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { FieldError } from "react-hook-form";
import { formatDateWithDay } from "@/lib/repositories/utils";

interface Trip {
  id: string;
  trip_date: string;
  departure_time: string | null;
  target_species: string | null;
  boats: { name: string } | { name: string }[] | null;
}

interface Props {
  accountId: string;
  trips: Trip[];
  defaultTripId?: string;
}

const COMPANION_EMPTY = {
  full_name: "",
  age: undefined,
  phone: "",
  address: "",
  emergency_phone: "",
  notes: "",
};

export function VisitorManifestForm({ accountId, trips, defaultTripId }: Props) {
  const [done, setDone] = useState<{ code: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<VisitorManifest>({
    resolver: zodResolver(VisitorManifestSchema),
    defaultValues: {
      account_id: accountId,
      trip_id: defaultTripId ?? "",
      passengers_count: 1,
      full_name: "",
      age: undefined,
      phone: "",
      address: "",
      emergency_name: "",
      emergency_phone: "",
      companions: [],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "companions" });

  const onSubmit = async (data: VisitorManifest) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/public/manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "提出に失敗しました");
      setDone({ code: json.reservation_code });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "提出に失敗しました");
    }
  };

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h2 className="text-lg font-bold text-gray-800">名簿の提出が完了しました</h2>
        <p className="text-sm text-gray-500">
          予約番号：<span className="font-mono font-bold text-gray-800">{done.code}</span>
        </p>
        <p className="text-xs text-gray-400">この画面をスクリーンショットで保存してください</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* hidden field */}
      <input type="hidden" {...register("account_id")} />

      {/* 便選択 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-700">乗船する便を選択</h2>
        <FormField label="便" error={errors.trip_id} required>
          <Select {...register("trip_id")} hasError={!!errors.trip_id}>
            <option value="">— 選択してください —</option>
            {trips.map((t) => {
              const boatName = Array.isArray(t.boats)
                ? t.boats[0]?.name ?? ""
                : (t.boats as { name: string } | null)?.name ?? "";
              const time = t.departure_time ? ` ${t.departure_time.slice(0, 5)}〜` : "";
              const species = t.target_species ? ` ${t.target_species}` : "";
              return (
                <option key={t.id} value={t.id}>
                  {formatDateWithDay(t.trip_date)}{time}{boatName ? ` ${boatName}` : ""}{species}
                </option>
              );
            })}
          </Select>
        </FormField>

      </div>

      {/* 代表者情報 */}
      <PersonFields
        prefix=""
        title="代表者情報"
        register={register}
        errors={{
          full_name: errors.full_name,
          age: errors.age,
          phone: errors.phone,
          address: errors.address,
          emergency_phone: errors.emergency_phone,
          notes: errors.notes,
        }}
      />

      {/* 同行者 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">同行者（任意）</h2>
          <button
            type="button"
            onClick={() => append(COMPANION_EMPTY)}
            className="text-xs text-brand-600 font-medium border border-brand-200 rounded-lg px-3 py-1 hover:bg-brand-50"
          >
            ＋ 追加
          </button>
        </div>
        {fields.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-1">
            同行者がいる場合は追加してください
          </p>
        )}
        {fields.map((field, index) => (
          <div key={field.id} className="border border-gray-100 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">同行者 {index + 1}</span>
              <button type="button" onClick={() => remove(index)} className="text-xs text-red-500">削除</button>
            </div>
            <PersonFields
              prefix={`companions.${index}.`}
              title=""
              register={register}
              errors={{
                full_name: errors.companions?.[index]?.full_name,
                age: errors.companions?.[index]?.age,
                phone: errors.companions?.[index]?.phone,
                address: errors.companions?.[index]?.address,
                emergency_phone: errors.companions?.[index]?.emergency_phone,
                notes: errors.companions?.[index]?.notes,
              }}
              compact
            />
          </div>
        ))}
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
        名簿を提出する
      </Button>
    </form>
  );
}

// ── 共通フィールド ──────────────────────────────────────────────────────────

interface PersonFieldsProps {
  prefix: string;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  errors: {
    full_name?: FieldError;
    age?: FieldError;
    phone?: FieldError;
    address?: FieldError;
    emergency_phone?: FieldError;
    notes?: FieldError;
  };
  compact?: boolean;
}

function PersonFields({ prefix, title, register, errors, compact }: PersonFieldsProps) {
  const f = (name: string) => `${prefix}${name}`;
  return (
    <div className={compact ? "space-y-2" : "bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3"}>
      {title && <h2 className="text-sm font-bold text-gray-700">{title}</h2>}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <FormField label="氏名" error={errors.full_name} required>
            <Input {...register(f("full_name"))} hasError={!!errors.full_name} placeholder="山田 太郎" />
          </FormField>
        </div>
        <FormField label="年齢" error={errors.age}>
          <Input type="number" min={0} max={150} {...register(f("age"))} placeholder="35" />
        </FormField>
      </div>
      <FormField label="電話番号" error={errors.phone} required={!compact}>
        <Input {...register(f("phone"))} hasError={!!errors.phone} type="tel" placeholder="090-0000-0000" />
      </FormField>
      <FormField label="住所" error={errors.address} required={!compact}>
        <Input {...register(f("address"))} hasError={!!errors.address} placeholder="東京都○○区..." />
      </FormField>
      <FormField label="緊急連絡先 電話番号" error={errors.emergency_phone} required={!compact}>
        <Input {...register(f("emergency_phone"))} hasError={!!errors.emergency_phone} type="tel" placeholder="080-0000-0000" />
      </FormField>
      <FormField label="備考（任意）" error={errors.notes}>
        <Textarea {...register(f("notes"))} rows={2} placeholder="船酔いしやすい、など" />
      </FormField>
    </div>
  );
}

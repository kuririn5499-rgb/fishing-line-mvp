/**
 * 乗船名簿フォーム（customer 用）
 * 代表者 + 任意で同行者を追加可能（各自同じ項目）
 */

"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ManifestSubmitSchema, type ManifestSubmit } from "@/lib/schemas";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import type { FieldError } from "react-hook-form";
import type { Reservation, BoardingManifest } from "@/types";

interface ManifestFormProps {
  reservations: Reservation[];
  defaultValues: BoardingManifest | null;
}

const COMPANION_EMPTY = {
  full_name: "",
  age: undefined,
  phone: "",
  address: "",
  emergency_phone: "",
  notes: "",
};

export function ManifestForm({ reservations, defaultValues }: ManifestFormProps) {
  const { toast, show, hide } = useToast();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ManifestSubmit>({
    resolver: zodResolver(ManifestSubmitSchema),
    defaultValues: {
      reservation_id: "",
      full_name: defaultValues?.full_name ?? "",
      age: defaultValues?.age ?? undefined,
      phone: defaultValues?.phone ?? "",
      address: defaultValues?.address ?? "",
      emergency_name: "",
      emergency_phone: defaultValues?.emergency_phone ?? "",
      life_jacket_owned: false,
      rental_required: false,
      companions: [],
      notes: defaultValues?.notes ?? "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "companions" });

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
              className="text-xs text-brand-600 font-medium border border-brand-200 rounded-lg px-3 py-1 hover:bg-brand-50 transition-colors"
            >
              ＋ 同行者を追加
            </button>
          </div>

          {fields.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">
              同行者がいる場合は追加してください
            </p>
          )}

          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-100 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">同行者 {index + 1}</span>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-xs text-red-500 font-medium"
                >
                  削除
                </button>
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

        <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
          名簿を提出する
        </Button>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}

// ── 共通フィールドコンポーネント ─────────────────────────────────────────────
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
            <Input
              {...register(f("full_name"))}
              hasError={!!errors.full_name}
              placeholder="山田 太郎"
            />
          </FormField>
        </div>
        <FormField label="年齢" error={errors.age}>
          <Input
            type="number"
            min={0}
            max={150}
            {...register(f("age"))}
            placeholder="35"
          />
        </FormField>
      </div>

      <FormField label="電話番号" error={errors.phone} required={!compact}>
        <Input
          {...register(f("phone"))}
          hasError={!!errors.phone}
          type="tel"
          placeholder="090-0000-0000"
        />
      </FormField>

      <FormField label="住所" error={errors.address} required={!compact}>
        <Input
          {...register(f("address"))}
          hasError={!!errors.address}
          placeholder="東京都○○区..."
        />
      </FormField>

      <FormField label="緊急連絡先 電話番号" error={errors.emergency_phone} required={!compact}>
        <Input
          {...register(f("emergency_phone"))}
          hasError={!!errors.emergency_phone}
          type="tel"
          placeholder="080-0000-0000"
        />
      </FormField>

      <FormField label="備考（任意）" error={errors.notes}>
        <Textarea
          {...register(f("notes"))}
          rows={2}
          placeholder="船酔いしやすい、車椅子対応など"
        />
      </FormField>
    </div>
  );
}

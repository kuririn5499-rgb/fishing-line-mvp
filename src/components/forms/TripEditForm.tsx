"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TripCreateSchema, type TripCreate } from "@/lib/schemas";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import type { Trip } from "@/types";

interface TripEditFormProps {
  trip: Trip & { boats?: { name: string } | null };
  boats: { id: string; name: string }[];
  methodTags?: string[];
  locationTags?: string[];
}

export function TripEditForm({ trip, boats, methodTags = [], locationTags = [] }: TripEditFormProps) {
  const router = useRouter();
  const { toast, show, hide } = useToast();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TripCreate>({
    resolver: zodResolver(TripCreateSchema),
    defaultValues: {
      boat_id: trip.boat_id ?? undefined,
      trip_date: trip.trip_date,
      departure_time: trip.departure_time?.slice(0, 5) ?? "",
      return_time: trip.return_time?.slice(0, 5) ?? "",
      target_species: trip.target_species ?? "",
      fishing_method: (trip as Trip & { fishing_method?: string }).fishing_method ?? "",
      location: (trip as Trip & { location?: string }).location ?? "",
      capacity: trip.capacity ?? undefined,
      price_per_person: trip.price_per_person ?? undefined,
      weather_note: trip.weather_note ?? "",
    },
  });

  const onSubmit = async (data: TripCreate) => {
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "更新に失敗しました");

      show(
        json.cal_warning ? `更新しました（${json.cal_warning}）` : "更新しました",
        json.cal_warning ? "error" : "success"
      );
      setOpen(false);
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "更新に失敗しました", "error");
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-brand-600 underline underline-offset-2 mt-1"
      >
        編集
      </button>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-3 pt-3 border-t border-gray-100 space-y-3"
      >
        <p className="text-xs font-bold text-gray-600">便を編集</p>

        <FormField label="日付" error={errors.trip_date} required>
          <Input type="date" {...register("trip_date")} hasError={!!errors.trip_date} />
        </FormField>

        {boats.length > 0 && (
          <FormField label="船" error={errors.boat_id}>
            <Select {...register("boat_id")} hasError={!!errors.boat_id}>
              <option value="">— 選択 —</option>
              {boats.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField label="出港時間" error={errors.departure_time}>
            <Input type="time" {...register("departure_time")} />
          </FormField>
          <FormField label="帰港時間" error={errors.return_time}>
            <Input type="time" {...register("return_time")} />
          </FormField>
        </div>

        <FormField label="釣り物" error={errors.target_species}>
          <Input {...register("target_species")} placeholder="タイラバ、アジ釣りなど" />
        </FormField>

        <FormField label="釣り方" error={errors.fishing_method}>
          <input
            list="edit-method-list"
            {...register("fishing_method")}
            placeholder="登録済みから選ぶか入力"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          {methodTags.length > 0 && (
            <datalist id="edit-method-list">
              {methodTags.map((m) => <option key={m} value={m} />)}
            </datalist>
          )}
        </FormField>

        <FormField label="場所" error={errors.location}>
          <input
            list="edit-location-list"
            {...register("location")}
            placeholder="登録済みから選ぶか入力"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          {locationTags.length > 0 && (
            <datalist id="edit-location-list">
              {locationTags.map((l) => <option key={l} value={l} />)}
            </datalist>
          )}
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="定員" error={errors.capacity}>
            <Input type="number" min={1} max={100} {...register("capacity")} />
          </FormField>
          <FormField label="料金（円/名）" error={errors.price_per_person}>
            <Input type="number" min={0} {...register("price_per_person")} />
          </FormField>
        </div>

        <FormField label="天気メモ" error={errors.weather_note}>
          <Input {...register("weather_note")} placeholder="晴れ、波1m など" />
        </FormField>

        <div className="flex gap-2">
          <Button type="submit" loading={isSubmitting} className="flex-1">
            保存
          </Button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-1 text-sm text-gray-500 bg-gray-100 rounded-xl py-2 px-4"
          >
            キャンセル
          </button>
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}

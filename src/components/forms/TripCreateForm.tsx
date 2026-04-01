/**
 * 便作成フォーム（captain 用）
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { TripCreateSchema, type TripCreate } from "@/lib/schemas";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";

interface TripCreateFormProps {
  boats: { id: string; name: string }[];
}

export function TripCreateForm({ boats }: TripCreateFormProps) {
  const { toast, show, hide } = useToast();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TripCreate>({
    resolver: zodResolver(TripCreateSchema),
    defaultValues: {
      trip_date: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = async (data: TripCreate) => {
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "作成に失敗しました");
      show("便を作成しました", "success");
      reset();
      setOpen(false);
    } catch (err) {
      show(err instanceof Error ? err.message : "作成に失敗しました", "error");
    }
  };

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-full">
        ＋ 新しい便を追加
      </Button>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">便を作成</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-gray-400"
          >
            閉じる
          </button>
        </div>

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
          <Input
            {...register("target_species")}
            placeholder="タイラバ、アジ釣りなど"
          />
        </FormField>

        <FormField label="定員" error={errors.capacity}>
          <Input type="number" min={1} max={100} {...register("capacity")} />
        </FormField>

        <FormField label="天気メモ" error={errors.weather_note}>
          <Input {...register("weather_note")} placeholder="晴れ、波1m など" />
        </FormField>

        <Button type="submit" loading={isSubmitting} className="w-full">
          便を作成
        </Button>
      </form>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hide} />
      )}
    </>
  );
}

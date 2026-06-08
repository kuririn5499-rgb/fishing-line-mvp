"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { CaptainReservationCreateSchema, type CaptainReservationCreate } from "@/lib/schemas";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { formatDateWithDay } from "@/lib/repositories/utils";

interface Trip {
  id: string;
  trip_date: string;
  departure_time: string | null;
  target_species: string | null;
  boat_name: string | null;
}

interface ManualReservationFormProps {
  trips: Trip[];
  onCreated?: () => void;
}

type ViewState = "button" | "form" | "success";

export function ManualReservationForm({ trips, onCreated }: ManualReservationFormProps) {
  const [view, setView] = useState<ViewState>("button");
  const [completedCode, setCompletedCode] = useState<string>("");
  const [calWarning, setCalWarning] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CaptainReservationCreate>({
    resolver: zodResolver(CaptainReservationCreateSchema),
    defaultValues: {
      passengers_count: 1,
      status: "confirmed",
    },
  });

  const onSubmit = async (data: CaptainReservationCreate) => {
    setErrorMsg("");
    try {
      const res = await fetch("/api/captain/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "作成に失敗しました");

      setCompletedCode(json.reservation.reservation_code);
      setCalWarning(json.calendarWarning ?? "");
      reset();
      setView("success");
      onCreated?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "作成に失敗しました");
    }
  };

  // ボタンのみ表示
  if (view === "button") {
    return (
      <Button variant="secondary" onClick={() => setView("form")} className="w-full">
        ＋ 手動で予約を入力（電話受付など）
      </Button>
    );
  }

  // 完了画面
  if (view === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-3">
        <div className="text-4xl">✅</div>
        <p className="text-base font-bold text-green-800">予約が完了しました</p>
        <p className="text-sm text-green-700">
          予約コード: <span className="font-mono font-bold">{completedCode}</span>
        </p>
        {calWarning && (
          <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            ⚠️ カレンダー同期: {calWarning}
          </p>
        )}
        <div className="flex gap-2 justify-center pt-1">
          <Button
            variant="primary"
            onClick={() => { setView("form"); setCalWarning(""); }}
          >
            続けて入力
          </Button>
          <Button
            variant="secondary"
            onClick={() => { setView("button"); setCalWarning(""); }}
          >
            閉じる
          </Button>
        </div>
      </div>
    );
  }

  // フォーム表示
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white rounded-2xl border border-brand-200 shadow-sm p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700">予約を手動入力</h2>
        <button
          type="button"
          onClick={() => { setView("button"); reset(); setErrorMsg(""); }}
          className="text-xs text-gray-400"
        >
          閉じる
        </button>
      </div>

      <FormField label="便を選択" error={errors.trip_id} required>
        <Select {...register("trip_id")} hasError={!!errors.trip_id}>
          <option value="">— 便を選択してください —</option>
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {formatDateWithDay(t.trip_date)}
              {t.departure_time ? ` ${t.departure_time.slice(0, 5)}〜` : ""}
              {t.boat_name ? ` ${t.boat_name}` : ""}
              {t.target_species ? ` / ${t.target_species}` : ""}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="お名前" error={errors.customer_name} required>
        <Input
          {...register("customer_name")}
          placeholder="山田 太郎"
          hasError={!!errors.customer_name}
        />
      </FormField>

      <FormField label="電話番号" error={errors.customer_phone}>
        <Input
          {...register("customer_phone")}
          type="tel"
          placeholder="090-0000-0000"
          hasError={!!errors.customer_phone}
        />
      </FormField>

      <FormField label="乗船人数" error={errors.passengers_count} required>
        <Input
          {...register("passengers_count")}
          type="number"
          min={1}
          max={20}
          hasError={!!errors.passengers_count}
        />
      </FormField>

      <FormField label="ステータス" error={errors.status}>
        <Select {...register("status")}>
          <option value="confirmed">確定</option>
          <option value="pending">仮予約</option>
        </Select>
      </FormField>

      <FormField label="メモ" error={errors.memo}>
        <Textarea
          {...register("memo")}
          placeholder="電話受付、特記事項など"
          rows={2}
        />
      </FormField>

      {errorMsg && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
      )}

      <Button type="submit" loading={isSubmitting} className="w-full">
        予約を登録する
      </Button>
    </form>
  );
}

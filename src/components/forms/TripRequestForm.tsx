"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TripRequestCreateSchema, type TripRequestCreate } from "@/lib/schemas";
import { FormField, Input, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";

interface TripRequestFormProps {
  /** true のとき常に展開表示（ページ単独表示用） */
  page?: boolean;
}

export function TripRequestForm({ page = false }: TripRequestFormProps) {
  const [open, setOpen] = useState(page);
  const [done, setDone] = useState(false);
  const { toast, show, hide } = useToast();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TripRequestCreate>({
    resolver: zodResolver(TripRequestCreateSchema),
    defaultValues: {
      requested_date: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = async (data: TripRequestCreate) => {
    try {
      const res = await fetch("/api/trip-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "送信に失敗しました");
      if (page) {
        setDone(true);
      } else {
        show("リクエストを送信しました！承認をお待ちください", "success");
        reset();
        setOpen(false);
        router.refresh();
      }
    } catch (err) {
      show(err instanceof Error ? err.message : "送信に失敗しました", "error");
    }
  };

  // ページモード：送信完了画面
  if (page && done) {
    return (
      <div className="text-center space-y-4 py-8">
        <p className="text-4xl">🙋</p>
        <p className="text-base font-bold text-gray-800">リクエストを送信しました！</p>
        <p className="text-sm text-gray-500">船長の承認をお待ちください。</p>
        <button
          onClick={() => router.push("/customer")}
          className="text-sm text-brand-600 underline"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex flex-col items-center justify-center gap-1.5 h-24 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 hover:bg-brand-100 transition-colors"
      >
        <span className="text-2xl">🙋</span>
        <span className="text-sm font-medium text-brand-700">便をリクエスト</span>
      </button>
    );
  }

  return (
    <>
      <div className={page ? "space-y-4" : "bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4"}>
        {!page && (
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">便のリクエスト</h2>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400">
              閉じる
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <FormField label="希望日" error={errors.requested_date} required>
            <Input type="date" {...register("requested_date")} hasError={!!errors.requested_date} />
          </FormField>

          <FormField label="釣り物・釣り方" error={errors.target_species}>
            <Input
              {...register("target_species")}
              placeholder="タイラバ、アジ釣り、泳がせなど"
            />
          </FormField>

          <FormField label="メッセージ（任意）" error={errors.message}>
            <Textarea
              {...register("message")}
              placeholder="人数の目安や希望があればご記入ください"
              rows={3}
            />
          </FormField>

          <Button type="submit" loading={isSubmitting} className="w-full">
            リクエストを送信
          </Button>
        </form>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}

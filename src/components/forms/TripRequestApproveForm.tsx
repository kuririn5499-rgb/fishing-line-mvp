"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TripRequestApproveSchema, type TripRequestApprove } from "@/lib/schemas";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import { formatDateWithDay } from "@/lib/repositories/utils";

interface Props {
  request: {
    id: string;
    requested_date: string;
    target_species: string | null;
    message: string | null;
    requesterName: string | null;
  };
  boats: { id: string; name: string }[];
}

export function TripRequestApproveForm({ request, boats }: Props) {
  const [mode, setMode] = useState<"idle" | "approving">("idle");
  const [loading, setLoading] = useState(false);
  const { toast, show, hide } = useToast();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TripRequestApprove>({
    resolver: zodResolver(TripRequestApproveSchema),
    defaultValues: {
      target_species: request.target_species ?? "",
    },
  });

  const onApprove = async (data: TripRequestApprove) => {
    try {
      const res = await fetch(`/api/captain/trip-requests/${request.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "承認に失敗しました");
      show("便を作成してリクエストを承認しました", "success");
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "承認に失敗しました", "error");
    }
  };

  const onReject = async () => {
    if (!confirm("このリクエストを断りますか？")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/captain/trip-requests/${request.id}/reject`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "失敗しました");
      show("リクエストを断りました", "success");
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {/* リクエスト内容 */}
        <div className="text-sm space-y-1">
          <p><span className="text-gray-400 text-xs">希望日</span><br /><span className="font-semibold">{formatDateWithDay(request.requested_date)}</span></p>
          {request.target_species && (
            <p><span className="text-gray-400 text-xs">釣り物・釣り方</span><br /><span className="font-medium">{request.target_species}</span></p>
          )}
          {request.message && (
            <p><span className="text-gray-400 text-xs">メッセージ</span><br /><span className="text-gray-600">{request.message}</span></p>
          )}
        </div>

        {/* アクションボタン */}
        {mode === "idle" && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setMode("approving")} className="flex-1">
              ✅ 承認して便を作成
            </Button>
            <Button size="sm" variant="danger" onClick={onReject} loading={loading} className="flex-1">
              ✕ 断る
            </Button>
          </div>
        )}

        {/* 承認フォーム */}
        {mode === "approving" && (
          <form onSubmit={handleSubmit(onApprove)} className="space-y-3 border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500">日付はリクエスト内容を引き継ぎます</p>

            <FormField label="釣り物・釣り方" error={errors.target_species}>
              <Input
                {...register("target_species")}
                placeholder="タイラバ、アジ釣りなど"
              />
            </FormField>

            {boats.length > 0 && (
              <FormField label="船" error={errors.boat_id}>
                <Select {...register("boat_id")}>
                  <option value="">— 選択 —</option>
                  {boats.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
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

            <div className="grid grid-cols-2 gap-3">
              <FormField label="定員" error={errors.capacity}>
                <Input type="number" min={1} max={100} {...register("capacity")} placeholder="10" />
              </FormField>
              <FormField label="料金（円/名）" error={errors.price_per_person}>
                <Input type="number" min={0} {...register("price_per_person")} placeholder="15000" />
              </FormField>
            </div>

            <div className="flex gap-2">
              <Button type="submit" loading={isSubmitting} className="flex-1">
                便を作成して承認
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode("idle")}>
                戻る
              </Button>
            </div>
          </form>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}

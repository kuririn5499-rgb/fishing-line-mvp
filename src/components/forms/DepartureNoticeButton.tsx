/**
 * 出船判断ボタン
 * 便管理画面の各便カードに表示する
 * 出船 or 中止を選んで予約者全員にLINE通知を送る
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";

interface DepartureNoticeButtonProps {
  tripId: string;
  tripDate: string;
  departureTime?: string | null;
  targetSpecies?: string | null;
}

export function DepartureNoticeButton({
  tripId,
  tripDate,
  departureTime,
  targetSpecies,
}: DepartureNoticeButtonProps) {
  const [open, setOpen] = useState(false);
  const [judgement, setJudgement] = useState<"go" | "cancel">("go");
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast, show, hide } = useToast();

  const timeStr = departureTime ? departureTime.slice(0, 5) : "";
  const label = `${tripDate}${timeStr ? ` ${timeStr}` : ""}${targetSpecies ? ` ${targetSpecies}` : ""}`;

  async function send() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/departure-notice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judgement,
          cancel_reason: judgement === "cancel" ? cancelReason : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "送信に失敗しました");
      show(`通知を送信しました（${json.sentCount}名）`, "success");
      setOpen(false);
    } catch (err) {
      show(err instanceof Error ? err.message : "送信に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition"
      >
        出船判断を送信
      </button>

      {/* モーダル */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 px-4 pb-6">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-800">出船判断を通知</h2>
            <p className="text-sm text-gray-500">{label}</p>

            {/* 出船 / 中止 切り替え */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setJudgement("go")}
                className={`py-3 rounded-xl text-sm font-semibold border transition ${
                  judgement === "go"
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                🚢 出船します
              </button>
              <button
                onClick={() => setJudgement("cancel")}
                className={`py-3 rounded-xl text-sm font-semibold border transition ${
                  judgement === "cancel"
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                ❌ 出船中止
              </button>
            </div>

            {/* 中止理由 */}
            {judgement === "cancel" && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  中止の理由
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="強風・高波のため など"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500"
              >
                キャンセル
              </button>
              <Button
                onClick={send}
                loading={loading}
                className={`flex-1 ${judgement === "cancel" ? "bg-red-500 hover:bg-red-600" : ""}`}
              >
                LINE で送信
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}

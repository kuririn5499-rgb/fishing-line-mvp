/**
 * 出船判断ボタン
 * 送信前: 「出船判断を送信」ボタン
 * 送信後: 「送信済み（出船 or 中止）」＋「再送信」ボタン
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
  initialJudgement?: "go" | "cancel" | null;
  initialCancelReason?: string | null;
}

export function DepartureNoticeButton({
  tripId,
  tripDate,
  departureTime,
  targetSpecies,
  initialJudgement = null,
  initialCancelReason = null,
}: DepartureNoticeButtonProps) {
  const [open, setOpen] = useState(false);
  const [judgement, setJudgement] = useState<"go" | "cancel">("go");
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentJudgement, setSentJudgement] = useState<"go" | "cancel" | null>(initialJudgement);
  const [sentCancelReason, setSentCancelReason] = useState<string | null>(initialCancelReason);
  const { toast, show, hide } = useToast();

  const timeStr = departureTime ? departureTime.slice(0, 5) : "";
  const label = `${tripDate}${timeStr ? ` ${timeStr}` : ""}${targetSpecies ? ` ${targetSpecies}` : ""}`;

  function openModal() {
    // 再送信時は前回の内容を初期値にセット
    setJudgement(sentJudgement ?? "go");
    setCancelReason(sentCancelReason ?? "");
    setOpen(true);
  }

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
      setSentJudgement(judgement);
      setSentCancelReason(judgement === "cancel" ? cancelReason : null);
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
      {sentJudgement ? (
        /* 送信済み表示 */
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
              sentJudgement === "go"
                ? "bg-green-50 border-green-300 text-green-700"
                : "bg-red-50 border-red-300 text-red-700"
            }`}
          >
            {sentJudgement === "go" ? "🚢 出船通知済み" : "❌ 中止通知済み"}
          </span>
          <button
            onClick={openModal}
            className="text-xs px-2 py-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition"
          >
            再送信
          </button>
        </div>
      ) : (
        /* 未送信 */
        <button
          onClick={openModal}
          className="text-xs px-3 py-1.5 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition"
        >
          出船判断を送信
        </button>
      )}

      {/* モーダル */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 px-4 pb-6">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">出船判断を通知</h2>
              {sentJudgement && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  再送信
                </span>
              )}
            </div>
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

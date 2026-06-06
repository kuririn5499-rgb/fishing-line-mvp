"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toast, useToast } from "@/components/ui/Toast";

interface Props {
  rewardId: string;
  rewardTitle: string;
  pointsRequired: number;
  currentPoints: number;
}

export function PointRedeemButton({
  rewardId,
  rewardTitle,
  pointsRequired,
  currentPoints,
}: Props) {
  const router = useRouter();
  const { toast, show, hide } = useToast();
  const [loading, setLoading] = useState(false);
  const canRedeem = currentPoints >= pointsRequired;

  const handleRedeem = async () => {
    if (!canRedeem) return;
    if (!confirm(`「${rewardTitle}」を申請しますか？\n${pointsRequired.toLocaleString()} pt が消費されます。`)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/customer/point-redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reward_id: rewardId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "申請に失敗しました");
      show("申請しました！船長の確認をお待ちください。", "success");
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "申請に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleRedeem}
        disabled={!canRedeem || loading}
        className={`text-xs font-bold px-4 py-1.5 rounded-full transition-colors shrink-0
          ${canRedeem
            ? "bg-brand-500 text-white hover:bg-brand-600 active:scale-95"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
          } disabled:opacity-60`}
      >
        {loading ? "申請中…" : canRedeem ? "申請する" : "PT不足"}
      </button>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}

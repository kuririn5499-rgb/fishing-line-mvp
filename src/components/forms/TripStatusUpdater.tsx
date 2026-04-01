/**
 * 便ステータス変更コンポーネント（captain 用）
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import type { TripStatus } from "@/types";

interface TripStatusUpdaterProps {
  tripId: string;
  currentStatus: TripStatus;
}

/** 現在のステータスから遷移可能なステータス */
const transitions: Record<TripStatus, TripStatus[]> = {
  draft:     ["open", "cancelled"],
  open:      ["full", "confirmed", "cancelled"],
  full:      ["open", "confirmed", "cancelled"],
  confirmed: ["cancelled", "completed"],
  cancelled: [],
  completed: [],
};

const statusLabels: Record<TripStatus, string> = {
  draft:     "下書き",
  open:      "受付開始",
  full:      "満員にする",
  confirmed: "確定",
  cancelled: "中止",
  completed: "完了",
};

export function TripStatusUpdater({ tripId, currentStatus }: TripStatusUpdaterProps) {
  const { toast, show, hide } = useToast();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const next = transitions[status];
  if (next.length === 0) return null;

  const updateStatus = async (newStatus: TripStatus) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "更新失敗");
      setStatus(newStatus);
      show(`ステータスを「${statusLabels[newStatus]}」に変更しました`, "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "更新失敗", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
        {next.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === "cancelled" ? "danger" : "secondary"}
            onClick={() => updateStatus(s)}
            loading={loading}
          >
            {statusLabels[s]}
          </Button>
        ))}
      </div>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hide} />
      )}
    </>
  );
}

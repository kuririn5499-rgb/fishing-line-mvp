"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";

interface Props {
  reservationId: string;
  currentStatus: string;
  onCancelled?: () => void;
}

export function CancelReservationButton({ reservationId, currentStatus, onCancelled }: Props) {
  const { toast, show, hide } = useToast();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (status === "cancelled") {
    return <span className="text-xs text-gray-400">キャンセル済み</span>;
  }

  const doCancel = async () => {
    setLoading(true);
    setConfirming(false);
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "キャンセル失敗");
      setStatus("cancelled");
      show("予約をキャンセルしました", "success");
      onCancelled?.();
    } catch (err) {
      show(err instanceof Error ? err.message : "キャンセル失敗", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">本当にキャンセルしますか？</span>
          <Button size="sm" variant="danger" onClick={doCancel} loading={loading}>
            確定
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
            戻る
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="danger"
          onClick={() => setConfirming(true)}
          loading={loading}
        >
          キャンセル
        </Button>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}

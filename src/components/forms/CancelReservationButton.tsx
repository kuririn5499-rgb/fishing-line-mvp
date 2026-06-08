"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";

interface Props {
  reservationId: string;
  currentStatus: string;
  couponId?: string | null;
  onCancelled?: () => void;
}

export function CancelReservationButton({ reservationId, currentStatus, couponId, onCancelled }: Props) {
  const { toast, show, hide } = useToast();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [deleted, setDeleted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const doDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "削除失敗");
      setDeleted(true);
      onCancelled?.();
    } catch (err) {
      show(err instanceof Error ? err.message : "削除失敗", "error");
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  };

  if (deleted) return null;

  if (status === "cancelled") {
    return (
      <>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">本当に削除しますか？</span>
            <button
              onClick={doDelete}
              disabled={loading}
              className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {loading ? "…" : "削除"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500"
            >
              戻る
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-gray-400 hover:text-red-500 transition"
          >
            キャンセル済み・削除
          </button>
        )}
        {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
      </>
    );
  }

  const doCancel = async (restoreCoupon: boolean) => {
    setLoading(true);
    setConfirming(false);
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", restore_coupon: restoreCoupon }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "キャンセル失敗");
      setStatus("cancelled");
      show(restoreCoupon ? "キャンセルしました（クーポン返却済み）" : "キャンセルしました", "success");
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
        <div className="flex flex-col gap-2">
          {couponId ? (
            <>
              <p className="text-xs text-gray-600">クーポンはどうしますか？</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="danger" onClick={() => doCancel(true)} loading={loading}>
                  キャンセル＋クーポン返却
                </Button>
                <Button size="sm" variant="secondary" onClick={() => doCancel(false)} loading={loading}>
                  キャンセルのみ
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
                  戻る
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">本当にキャンセルしますか？</span>
              <Button size="sm" variant="danger" onClick={() => doCancel(false)} loading={loading}>
                確定
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
                戻る
              </Button>
            </div>
          )}
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

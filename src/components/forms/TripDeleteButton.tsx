"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";

interface TripDeleteButtonProps {
  tripId: string;
}

export function TripDeleteButton({ tripId }: TripDeleteButtonProps) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast, show, hide } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "削除に失敗しました");
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "削除に失敗しました", "error");
      setConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  if (!confirm) {
    return (
      <>
        <Button size="sm" variant="danger" onClick={() => setConfirm(true)}>
          削除
        </Button>
        {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
      </>
    );
  }

  return (
    <>
      <span className="text-xs text-red-600 font-medium">本当に削除しますか？</span>
      <Button size="sm" variant="danger" onClick={handleDelete} loading={loading}>
        はい
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setConfirm(false)}>
        いいえ
      </Button>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}

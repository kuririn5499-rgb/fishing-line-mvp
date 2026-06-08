"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  reservationId: string;
  tripDate: string;
}

export function ReservationCancelButton({ reservationId, tripDate }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    if (!confirm(`${tripDate}の予約をキャンセルしますか？\nキャンセルは取り消しできません。`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/cancel`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "キャンセルに失敗しました");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 underline mt-1"
    >
      {loading ? "処理中..." : "キャンセルする"}
    </button>
  );
}

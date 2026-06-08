"use client";

import { useState } from "react";
import { Toast, useToast } from "@/components/ui/Toast";

interface Props {
  reservationId: string;
  customerName: string | null;
}

export function ManifestReminderButton({ reservationId, customerName }: Props) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast, show, hide } = useToast();

  const handleSend = async () => {
    setLoading(true);
    try {
      const name = customerName ? `${customerName} 様` : "お客様";
      const message =
        `${name}、乗船名簿のご提出をお願いいたします。\n\n` +
        `出航前までに LINE アプリ内のメニューから「乗船名簿」をタップしてご提出ください。\n\n` +
        `ご不明な点がございましたらお気軽にご連絡ください。`;

      const res = await fetch(`/api/reservations/${reservationId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "送信失敗");
      setSent(true);
      show("提出依頼を送信しました", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "送信失敗", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {sent ? (
        <span className="text-xs text-green-600 font-medium">✓ 依頼送信済み</span>
      ) : (
        <button
          onClick={handleSend}
          disabled={loading}
          className="text-xs px-2.5 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition"
        >
          {loading ? "送信中..." : "📨 提出依頼"}
        </button>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}

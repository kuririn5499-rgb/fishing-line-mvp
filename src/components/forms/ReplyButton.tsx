"use client";

import { useState } from "react";
import { Toast, useToast } from "@/components/ui/Toast";

interface Props {
  reservationId: string;
  customerName: string | null;
}

export function ReplyButton({ reservationId, customerName }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast, show, hide } = useToast();

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "送信失敗");
      show("LINE で送信しました", "success");
      setMessage("");
      setOpen(false);
    } catch (err) {
      show(err instanceof Error ? err.message : "送信失敗", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-brand-600 hover:text-brand-800 transition"
        >
          💬 返信
        </button>
      ) : (
        <div className="mt-2 space-y-1.5">
          <p className="text-xs text-gray-500">
            {customerName ?? "お客様"} へ LINE で送信します
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="メッセージを入力..."
            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={loading || !message.trim()}
              className="text-xs px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {loading ? "送信中..." : "送信"}
            </button>
            <button
              onClick={() => { setOpen(false); setMessage(""); }}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}

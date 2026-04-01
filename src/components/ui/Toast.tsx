/**
 * トースト通知コンポーネント
 * フォーム保存成功 / 失敗のフィードバックに使う
 */

"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

const typeStyles: Record<ToastType, string> = {
  success: "bg-green-600 text-white",
  error:   "bg-red-600 text-white",
  info:    "bg-brand-600 text-white",
};

const typeIcons: Record<ToastType, string> = {
  success: "✓",
  error:   "✗",
  info:    "i",
};

export function Toast({
  message,
  type = "success",
  duration = 3000,
  onClose,
}: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg
        text-sm font-medium max-w-[90vw]
        animate-in slide-in-from-bottom-4 fade-in duration-300
        ${typeStyles[type]}
      `}
    >
      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
        {typeIcons[type]}
      </span>
      {message}
    </div>
  );
}

/** Toast を手軽に使うための useState フック */
export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const show = (message: string, type: ToastType = "success") => {
    setToast({ message, type });
  };

  const hide = () => setToast(null);

  return { toast, show, hide };
}

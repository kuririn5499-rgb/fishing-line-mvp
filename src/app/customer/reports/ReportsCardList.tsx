"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

interface LogEntry {
  id: string;
  message_type: string;
  title: string | null;
  body: string | null;
  sent_at: string;
}

interface ReportsCardListProps {
  logs: LogEntry[];
  logImages: Record<string, string[]>;
}

function formatSentAt(sentAt: string): string {
  const d = new Date(sentAt);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${h}:${min}`;
}

export function ReportsCardList({ logs, logImages }: ReportsCardListProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-3">
        {logs.map((log) => {
          const images = logImages[log.id] ?? [];
          return (
            <Card key={log.id}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">
                    {log.message_type === "fishing_report" ? "🐟" : "📢"}
                  </span>
                  <span className="text-xs font-semibold text-gray-700">
                    {log.message_type === "fishing_report" ? "釣果情報" : "お知らせ"}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto shrink-0">
                    {formatSentAt(log.sent_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed break-all">
                  {log.body}
                </p>
                {images.length > 0 && (
                  <div className={`grid gap-2 mt-1 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {images.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url}
                        alt={`釣果写真 ${i + 1}`}
                        className="w-full rounded-xl object-cover max-h-56 cursor-pointer active:opacity-80 transition-opacity"
                        onClick={() => setLightboxUrl(url)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ライトボックス */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 z-10 w-7 h-7 bg-white text-gray-800 rounded-full text-base font-bold flex items-center justify-center shadow-lg leading-none"
              aria-label="閉じる"
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="拡大表示"
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}

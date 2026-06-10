"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";

interface LogEntry {
  id: string;
  message_type: string;
  title: string | null;
  body: string | null;
  sent_at: string;
}

interface LightboxState {
  urls: string[];
  index: number;
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
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const open = useCallback((urls: string[], index: number) => {
    setLightbox({ urls, index });
  }, []);

  const close = useCallback(() => setLightbox(null), []);

  const goPrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLightbox((l) => l && l.index > 0 ? { ...l, index: l.index - 1 } : l);
  }, []);

  const goNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLightbox((l) => l && l.index < l.urls.length - 1 ? { ...l, index: l.index + 1 } : l);
  }, []);

  const hasPrev = lightbox && lightbox.index > 0;
  const hasNext = lightbox && lightbox.index < lightbox.urls.length - 1;

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
                        onClick={() => open(images, i)}
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
      {lightbox && (
        <div
          className="lb-overlay fixed inset-0 z-50 bg-black/88 flex items-center justify-center"
          onClick={close}
        >
          {/* 画像コンテナ */}
          <div
            className="relative flex items-center justify-center px-12"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 左矢印 */}
            <button
              onClick={goPrev}
              disabled={!hasPrev}
              aria-label="前の画像"
              className={`absolute left-0 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white text-xl transition-opacity ${
                hasPrev ? "opacity-100 hover:bg-white/35 active:bg-white/50" : "opacity-0 pointer-events-none"
              }`}
            >
              ‹
            </button>

            {/* 画像本体 — key で再マウント → ぼわんアニメ再実行 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`${lightbox.urls[lightbox.index]}-${lightbox.index}`}
              src={lightbox.urls[lightbox.index]}
              alt="拡大表示"
              className="lb-image max-w-[80vw] max-h-[82vh] object-contain rounded-xl shadow-2xl"
            />

            {/* 右矢印 */}
            <button
              onClick={goNext}
              disabled={!hasNext}
              aria-label="次の画像"
              className={`absolute right-0 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white text-xl transition-opacity ${
                hasNext ? "opacity-100 hover:bg-white/35 active:bg-white/50" : "opacity-0 pointer-events-none"
              }`}
            >
              ›
            </button>

            {/* 閉じるボタン */}
            <button
              onClick={close}
              aria-label="閉じる"
              className="absolute -top-4 -right-2 w-7 h-7 bg-white text-gray-800 rounded-full text-base font-bold flex items-center justify-center shadow-lg leading-none z-10"
            >
              ×
            </button>

            {/* 枚数インジケーター */}
            {lightbox.urls.length > 1 && (
              <div className="absolute -bottom-7 left-0 right-0 flex justify-center gap-1.5">
                {lightbox.urls.map((_, i) => (
                  <span
                    key={i}
                    className={`inline-block w-1.5 h-1.5 rounded-full transition-colors ${
                      i === lightbox.index ? "bg-white" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

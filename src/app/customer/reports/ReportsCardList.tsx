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
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={close}
        >
          {/* 左矢印 ＋ 画像 ＋ 右矢印 を横並びで配置 */}
          <div className="flex items-center gap-3 px-2" onClick={(e) => e.stopPropagation()}>

            {/* 左矢印（常に同サイズで存在、非表示のときは invisible） */}
            <button
              onClick={goPrev}
              aria-label="前の画像"
              className={`shrink-0 w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center text-5xl font-thin leading-none transition-opacity ${
                hasPrev ? "opacity-100 hover:bg-white/35 active:bg-white/50" : "opacity-0 pointer-events-none"
              }`}
            >
              ‹
            </button>

            {/* 画像 ＋ × ボタン ＋ ドットインジケーター */}
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={`${lightbox.index}`}
                src={lightbox.urls[lightbox.index]}
                alt="拡大表示"
                className="lb-image block max-h-[68vh] max-w-[calc(100vw-160px)] w-auto h-auto rounded-xl shadow-2xl object-contain"
              />

              {/* × ボタン：画像の右上に重ねる */}
              <button
                onClick={close}
                aria-label="閉じる"
                className="absolute top-2 right-2 w-8 h-8 bg-black/55 text-white rounded-full text-lg font-bold flex items-center justify-center leading-none shadow-md"
              >
                ×
              </button>

              {/* ドットインジケーター */}
              {lightbox.urls.length > 1 && (
                <div className="absolute -bottom-6 left-0 right-0 flex justify-center gap-1.5">
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

            {/* 右矢印 */}
            <button
              onClick={goNext}
              aria-label="次の画像"
              className={`shrink-0 w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center text-5xl font-thin leading-none transition-opacity ${
                hasNext ? "opacity-100 hover:bg-white/35 active:bg-white/50" : "opacity-0 pointer-events-none"
              }`}
            >
              ›
            </button>

          </div>
        </div>
      )}
    </>
  );
}

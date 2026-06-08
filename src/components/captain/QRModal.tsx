"use client";

import { useState } from "react";
import QRCode from "react-qr-code";

interface Props {
  accountSlug: string;
  trips: {
    id: string;
    label: string;
  }[];
}

export function QRModal({ accountSlug, trips }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<string>("");

  const base =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${accountSlug}`
      : `https://fishing-line-mvp.vercel.app/join/${accountSlug}`;

  const url = selectedTrip ? `${base}?trip=${selectedTrip}` : base;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50 transition"
      >
        <span>📷</span> QRコード
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full rounded-t-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">乗船名簿 QRコード</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 text-xl">×</button>
            </div>

            {/* 便を絞り込む（任意） */}
            {trips.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  便を指定（任意）
                </label>
                <select
                  value={selectedTrip}
                  onChange={(e) => setSelectedTrip(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="">すべての便（お客様が選択）</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* QRコード */}
            <div className="flex justify-center bg-white p-4 rounded-xl border border-gray-100">
              <QRCode value={url} size={220} />
            </div>

            <p className="text-xs text-gray-400 text-center break-all">{url}</p>

            <p className="text-xs text-gray-500 text-center bg-blue-50 rounded-xl px-3 py-2">
              お客様にこのQRを読み取ってもらうと<br />乗船名簿をその場で記入できます
            </p>

            <button
              onClick={() => setOpen(false)}
              className="w-full py-3 rounded-xl bg-[#0d2137] text-white text-sm font-semibold"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}

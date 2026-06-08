"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "captain_install_banner_dismissed";

export function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // LINE ブラウザ内かつ未却下のときだけ表示
    const isLine = /Line\//i.test(navigator.userAgent);
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (isLine && !dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    setShowGuide(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* バナー */}
      <div className="flex items-center gap-2 bg-[#0d2137] text-white text-xs px-4 py-2.5 rounded-xl mb-3">
        <span className="text-base shrink-0">📲</span>
        <span className="flex-1 leading-snug">
          ホーム画面に追加するとすぐ開けます
        </span>
        <button
          onClick={() => setShowGuide(true)}
          className="shrink-0 bg-[#e8b84b] text-[#0d2137] font-bold text-xs px-3 py-1 rounded-lg"
        >
          追加する
        </button>
        <button onClick={dismiss} className="shrink-0 text-white/50 text-lg leading-none pl-1">
          ×
        </button>
      </div>

      {/* 手順オーバーレイ */}
      {showGuide && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="bg-white w-full rounded-t-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">ホーム画面への追加手順</h2>
              <button onClick={() => setShowGuide(false)} className="text-gray-400 text-xl">×</button>
            </div>

            {/* Android */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Android</p>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#0d2137] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">右上の ⋯ → 「シェア」をタップ</p>
                    <p className="text-xs text-gray-500 mt-0.5">LINEブラウザのメニューを開く</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#0d2137] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">「Chrome」を選んで開く</p>
                    <p className="text-xs text-gray-500 mt-0.5">シェア先に Chrome が表示されます</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#0d2137] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Chrome の ⋮ → 「ホーム画面に追加」</p>
                  </div>
                </li>
              </ol>
            </div>

            <hr className="border-gray-100" />

            {/* iPhone */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">iPhone</p>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#0d2137] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">右上の ⋯ → 「ブラウザで開く」をタップ</p>
                    <p className="text-xs text-gray-500 mt-0.5">Safari で同じ画面が開きます</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#0d2137] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Safari の共有ボタン □↑ をタップ</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#0d2137] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">「ホーム画面に追加」をタップ</p>
                  </div>
                </li>
              </ol>
            </div>

            <button
              onClick={dismiss}
              className="w-full text-xs text-gray-400 pt-2"
            >
              今後このメッセージを表示しない
            </button>
          </div>
        </div>
      )}
    </>
  );
}

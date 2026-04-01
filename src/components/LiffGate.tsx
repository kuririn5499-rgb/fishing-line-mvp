/**
 * LiffGate — LIFF 初期化 + 認証を行うクライアントコンポーネント
 * セッションがない場合にレイアウトから呼ばれる
 * 認証完了後に redirectTo へリダイレクトする
 */

"use client";

import { useEffect, useState } from "react";

interface LiffGateProps {
  liffId: string;
  accountSlug: string;
  mode: "customer" | "captain";
  redirectTo: string;
}

export function LiffGate({ liffId, accountSlug, mode, redirectTo }: LiffGateProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) throw new Error("idToken が取得できませんでした");

        const res = await fetch(`/api/auth?mode=${mode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, accountSlug }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "認証失敗");

        // 認証完了 → ページをリロードしてセッションを反映
        window.location.href = redirectTo;
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    }

    init();
  }, [liffId, accountSlug, mode, redirectTo]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center">
          <p className="text-5xl mb-4">⚠️</p>
          <p className="text-red-600 font-medium mb-2">ログインエラー</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">ログイン中...</p>
      </div>
    </div>
  );
}

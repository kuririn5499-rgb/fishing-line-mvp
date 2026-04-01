/**
 * LIFF 初期化プロバイダー
 * LIFF SDK を初期化し、idToken を /api/auth へ送ってセッションを確立する
 *
 * 使い方:
 *   <LiffProvider liffId={...} accountSlug={...} mode="customer">
 *     <App />
 *   </LiffProvider>
 */

"use client";

import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import type { Role } from "@/types";

interface LiffContextValue {
  ready: boolean;
  role: Role | null;
  error: string | null;
}

const LiffContext = createContext<LiffContextValue>({
  ready: false,
  role: null,
  error: null,
});

export function useLiff() {
  return useContext(LiffContext);
}

interface LiffProviderProps {
  liffId: string;
  accountSlug: string;
  mode: "customer" | "captain";
  children: ReactNode;
}

export function LiffProvider({
  liffId,
  accountSlug,
  mode,
  children,
}: LiffProviderProps) {
  const [state, setState] = useState<LiffContextValue>({
    ready: false,
    role: null,
    error: null,
  });

  useEffect(() => {
    async function init() {
      try {
        // LIFF SDK を動的インポート（SSR 対策）
        const liff = (await import("@line/liff")).default;

        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        // サーバーへ idToken を送って検証・セッション確立
        const idToken = liff.getIDToken();
        if (!idToken) throw new Error("idToken が取得できませんでした");

        const res = await fetch(`/api/auth?mode=${mode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, accountSlug }),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? "認証失敗");
        }

        const json = await res.json();
        setState({ ready: true, role: json.role, error: null });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "初期化エラー";
        setState({ ready: false, role: null, error: msg });
      }
    }

    init();
  }, [liffId, accountSlug, mode]);

  return (
    <LiffContext.Provider value={state}>
      {!state.ready && !state.error && (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">読み込み中...</p>
          </div>
        </div>
      )}
      {state.error && (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
          <div className="text-center">
            <p className="text-red-600 font-medium mb-2">エラーが発生しました</p>
            <p className="text-sm text-gray-500">{state.error}</p>
          </div>
        </div>
      )}
      {state.ready && children}
    </LiffContext.Provider>
  );
}

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
    // 開発環境では dev-login ページへリダイレクト
    if (process.env.NEXT_PUBLIC_DEV_BYPASS === "true") {
      window.location.href = `/dev-login?redirect=${encodeURIComponent(redirectTo)}`;
      return;
    }

    async function init() {
      try {
        // Next.js レイアウトは searchParams を受け取れないため、
        // クライアント側で URL の ?a= または localStorage から正しいアカウントを特定する
        const LS_KEY = `liff_slug_${mode}`;
        const urlSlug = new URLSearchParams(window.location.search).get("a");
        const cachedSlug = localStorage.getItem(LS_KEY);
        const resolvedSlug = urlSlug || cachedSlug || accountSlug;
        let effectiveSlug = resolvedSlug;
        let effectiveLiffId = liffId;

        if (resolvedSlug !== accountSlug) {
          try {
            const cfgRes = await fetch(
              `/api/public/liff-config?slug=${encodeURIComponent(resolvedSlug)}&mode=${mode}`
            );
            if (cfgRes.ok) {
              const cfg = await cfgRes.json();
              if (cfg.liffId) effectiveLiffId = cfg.liffId;
            }
          } catch {
            // フォールバック: props の liffId をそのまま使う
          }
        }

        // 次回のログアウト→再ログイン時のために slug を保存
        localStorage.setItem(LS_KEY, effectiveSlug);

        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: effectiveLiffId });

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) throw new Error("idToken が取得できませんでした");

        // profile スコープが無効でも続行できるよう try-catch
        let displayName: string | undefined;
        let pictureUrl: string | undefined;
        try {
          const profile = await liff.getProfile();
          displayName = profile.displayName;
          pictureUrl = profile.pictureUrl;
        } catch {
          // profile スコープなしでも認証継続
        }

        const res = await fetch(`/api/auth?mode=${mode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            accountSlug: effectiveSlug,
            displayName,
            pictureUrl,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "認証失敗");

        // サーバーが正しく解決したアカウントスラッグを保存（次回ログイン時のため）
        if (json.accountSlug) {
          localStorage.setItem(LS_KEY, json.accountSlug);
        }

        // 認証完了 → role に応じて適切なページへ直接遷移
        // customer ロールが captain URL から来た場合はカスタマーへ飛ばす
        const role: string = json.role ?? "customer";
        const captainRoles = ["captain", "staff", "admin", "operator"];
        if (mode === "captain" && !captainRoles.includes(role)) {
          window.location.href = "/customer";
        } else {
          window.location.href = redirectTo;
        }
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

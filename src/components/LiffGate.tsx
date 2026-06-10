"use client";

import { useEffect, useRef, useState } from "react";

interface LiffGateProps {
  liffId: string;
  accountSlug: string;
  mode: "customer" | "captain";
  redirectTo: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function LiffGate({ liffId, accountSlug, mode, redirectTo: _redirectTo }: LiffGateProps) {
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (process.env.NEXT_PUBLIC_DEV_BYPASS === "true") {
      window.location.href = "/dev-login";
      return;
    }

    (async () => {
      try {
        // URL の ?a= → sessionStorage → props の優先順でスラッグを決定
        const urlSlug =
          new URLSearchParams(window.location.search).get("a") ||
          sessionStorage.getItem("liff_account_slug");
        const effectiveSlug = urlSlug || accountSlug;
        let effectiveLiffId = liffId;

        // 異なるアカウントの LIFF ID をサーバーから取得
        if (urlSlug && urlSlug !== accountSlug) {
          try {
            const cfgRes = await fetch(
              `/api/public/liff-config?slug=${encodeURIComponent(urlSlug)}&mode=${mode}`
            );
            if (cfgRes.ok) {
              const cfg = await cfgRes.json();
              if (cfg.liffId) effectiveLiffId = cfg.liffId;
            }
          } catch {
            // フォールバック
          }
        }

        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: effectiveLiffId });

        if (!liff.isLoggedIn()) {
          // redirectUri に必ず ?a=slug を含める
          // これにより liff.login() 後に戻ってくる URL が正しいアカウントのエンドポイントになる
          const redirectUrl = new URL(window.location.href);
          redirectUrl.searchParams.set("a", effectiveSlug);
          liff.login({ redirectUri: redirectUrl.toString() });
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) throw new Error("idToken が取得できませんでした");

        let displayName: string | undefined;
        let pictureUrl: string | undefined;
        try {
          const profile = await liff.getProfile();
          displayName = profile.displayName;
          pictureUrl = profile.pictureUrl;
        } catch {
          // profile スコープなしでも継続
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
        if (!res.ok) {
          const errMsg: string = json.error ?? "認証失敗";
          // IDトークンが期限切れ or 無効 → キャッシュを破棄して再ログイン
          if (errMsg.toLowerCase().includes("expired") || errMsg.includes("invalid_request")) {
            liff.logout();
            const redirectUrl2 = new URL(window.location.href);
            redirectUrl2.searchParams.set("a", effectiveSlug);
            liff.login({ redirectUri: redirectUrl2.toString() });
            return;
          }
          throw new Error(errMsg);
        }

        const resolvedSlug = json.accountSlug || effectiveSlug;
        sessionStorage.setItem("liff_account_slug", resolvedSlug);

        const role: string = json.role ?? "customer";
        const captainRoles = ["captain", "staff", "admin", "operator"];

        // 遷移先に必ず ?a=slug を含める
        // こうすることで session 切れ時も LiffGate が正しいアカウントの LIFF を使える
        if (captainRoles.includes(role)) {
          window.location.href = `/captain?a=${encodeURIComponent(resolvedSlug)}`;
        } else {
          window.location.href = `/customer?a=${encodeURIComponent(resolvedSlug)}`;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

"use client";

import { useEffect } from "react";

export function AccountMismatchGuard({
  accountSlug,
  captainLiffId,
}: {
  accountSlug: string;
  captainLiffId: string;
}) {
  useEffect(() => {
    async function check() {
      // 方法1: URL の ?a= とセッションのスラッグを比較（高速）
      const urlSlug = new URLSearchParams(window.location.search).get("a");
      if (urlSlug && urlSlug !== accountSlug) {
        await fetch("/api/auth", { method: "DELETE" });
        window.location.reload();
        return;
      }

      // 方法2: LINE ブラウザ内での初回アクセス判定
      // sessionStorage は LIFF を閉じて再度開くとリセットされるため
      // 「別のLIFFに切り替えた = 初回アクセス」として再認証する
      const isLineBrowser = /Line\//i.test(navigator.userAgent);
      if (isLineBrowser) {
        const initialized = sessionStorage.getItem("liff_app_initialized");
        if (!initialized) {
          // フラグを先にセット（リロード後のループ防止）
          sessionStorage.setItem("liff_app_initialized", "1");
          await fetch("/api/auth", { method: "DELETE" });
          window.location.reload();
          return;
        }
      }

      // 方法3: LIFF コンテキストの JWT aud とセッションのチャンネルを比較（追加の保護）
      if (!captainLiffId || !isLineBrowser) return;
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: captainLiffId });

        const idToken = liff.getIDToken();
        if (!idToken) return;

        const b64 = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(b64)) as { aud?: string | string[] };
        const aud = payload.aud;
        const actualChannelId = Array.isArray(aud) ? aud[0] : aud;
        const expectedChannelId = captainLiffId.split("-")[0];

        if (actualChannelId && actualChannelId !== expectedChannelId) {
          await fetch("/api/auth", { method: "DELETE" });
          window.location.reload();
        }
      } catch {
        await fetch("/api/auth", { method: "DELETE" });
        window.location.reload();
      }
    }
    check();
  }, [accountSlug, captainLiffId]);

  return null;
}

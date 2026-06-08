"use client";

import { useEffect } from "react";

/**
 * カスタマー画面用のアカウントミスマッチ検出。
 * セッションのアカウントと実際に開かれているLIFFが違う場合にセッションをクリアする。
 */
export function CustomerAccountMismatchGuard({
  accountSlug,
  customerLiffId,
}: {
  accountSlug: string;
  customerLiffId: string;
}) {
  useEffect(() => {
    async function check() {
      const urlSlug = new URLSearchParams(window.location.search).get("a");
      if (urlSlug && urlSlug !== accountSlug) {
        await fetch("/api/auth", { method: "DELETE" });
        window.location.reload();
        return;
      }

      if (!customerLiffId) return;
      // LINE ブラウザ外はスキップ
      if (!/Line\//i.test(navigator.userAgent)) return;

      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: customerLiffId });

        const idToken = liff.getIDToken();
        if (!idToken) return;

        const b64 = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(b64)) as { aud?: string | string[] };
        const aud = payload.aud;
        const actualChannelId = Array.isArray(aud) ? aud[0] : aud;
        const expectedChannelId = customerLiffId.split("-")[0];

        if (actualChannelId && actualChannelId !== expectedChannelId) {
          await fetch("/api/auth", { method: "DELETE" });
          window.location.reload();
        }
      } catch {
        // init 失敗 = 別チャンネルのLIFF内の可能性が高い → セッションクリア
        await fetch("/api/auth", { method: "DELETE" });
        window.location.reload();
      }
    }
    check();
  }, [accountSlug, customerLiffId]);

  return null;
}

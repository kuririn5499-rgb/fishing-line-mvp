"use client";

import { useEffect } from "react";

/**
 * セッションのアカウントと実際に開かれているLIFFが異なる場合に
 * セッションをクリアして再認証する。
 *
 * 検出方法:
 * 1. URL の ?a= とセッションのスラッグを比較
 * 2. liff.getContext() で実際の liffId とセッションの liffId を比較
 */
export function AccountMismatchGuard({
  accountSlug,
  captainLiffId,
}: {
  accountSlug: string;
  captainLiffId: string;
}) {
  useEffect(() => {
    async function check() {
      // 方法1: URL の ?a= と比較（高速）
      const urlSlug = new URLSearchParams(window.location.search).get("a");
      if (urlSlug && urlSlug !== accountSlug) {
        await fetch("/api/auth", { method: "DELETE" });
        window.location.reload();
        return;
      }

      // 方法2: LIFF コンテキストの liffId と比較
      // captainLiffId がない or LINE ブラウザ外はスキップ
      if (!captainLiffId) return;
      // LINE ブラウザ外はスキップ
      if (!/Line\//i.test(navigator.userAgent)) return;

      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: captainLiffId });

        // liff.getContext().liffId は init に渡した値を返すため信頼できない。
        // IDトークンの aud クレームは常に実際に動いているLIFFのチャンネルIDになる。
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
        // init 失敗 = 別チャンネルのLIFF内の可能性が高い → セッションクリア
        await fetch("/api/auth", { method: "DELETE" });
        window.location.reload();
      }
    }
    check();
  }, [accountSlug, captainLiffId]);

  return null;
}

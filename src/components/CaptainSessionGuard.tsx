"use client";

/**
 * 端末に別人のセッションCookieが残っている場合を検出して自動ログアウトする。
 * LIFFの現在ユーザーIDとセッションのlineUserIdを照合する。
 */

import { useEffect } from "react";

interface Props {
  sessionLineUserId: string;
  captainLiffId: string;
}

export function CaptainSessionGuard({ sessionLineUserId, captainLiffId }: Props) {
  useEffect(() => {
    if (!captainLiffId || !sessionLineUserId) return;

    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: captainLiffId });

        // LIFFにログインしていない（通常ブラウザなど）はスキップ
        if (!liff.isLoggedIn()) return;

        // getProfile() で確実に現在の LINE ユーザーIDを取得
        const profile = await liff.getProfile();

        if (profile.userId !== sessionLineUserId) {
          // 別の LINE ユーザーのセッションが端末に残っている → ログアウトして再認証
          await fetch("/api/auth", { method: "DELETE" });
          window.location.reload();
        }
      } catch {
        // LIFF 初期化失敗などは無視
      }
    })();
  }, [sessionLineUserId, captainLiffId]);

  return null;
}

"use client";

import { useEffect } from "react";

/**
 * URL の ?a= とセッションのアカウントが違う場合にセッションを削除してリロード。
 * ミドルウェアが先に処理するので、ここに到達するケースは稀だが念のため。
 */
export function CustomerAccountMismatchGuard({
  accountSlug,
  customerLiffId: _customerLiffId,
}: {
  accountSlug: string;
  customerLiffId: string;
}) {
  useEffect(() => {
    const urlSlug = new URLSearchParams(window.location.search).get("a");
    if (urlSlug && urlSlug !== accountSlug) {
      fetch("/api/auth", { method: "DELETE" }).then(() =>
        window.location.reload()
      );
    }
  }, [accountSlug]);

  return null;
}

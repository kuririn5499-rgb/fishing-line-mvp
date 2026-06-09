"use client";

// セッションの別人検出は削除。LIFF を開くたびに liff.init() + getProfile() を
// 呼ぶことで発生していた不安定動作（チャンネル不一致による誤ログアウト）を解消。
export function CaptainSessionGuard(_props: {
  sessionLineUserId: string;
  captainLiffId: string;
}) {
  return null;
}

/**
 * /app — 共通エントリポイント
 *
 * LIFF でログインさせ、role に応じてリダイレクトする。
 * セッション Cookie が既にある場合は即リダイレクト。
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function AppEntryPage() {
  const session = await getSession();

  if (session) {
    // role に応じてリダイレクト
    if (session.role === "customer") redirect("/customer");
    if (session.role === "captain" || session.role === "staff") redirect("/captain");
    if (session.role === "operator" || session.role === "admin") redirect("/admin");
  }

  // セッションなし → LIFF ログインページを表示
  // （実際は LiffProvider で自動ログインするが、直接アクセスした場合の fallback）
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center space-y-4">
        <div className="text-5xl">🎣</div>
        <h1 className="text-xl font-bold text-sea-dark">遊漁船管理システム</h1>
        <p className="text-sm text-gray-500">
          LINE アプリからアクセスしてください
        </p>
      </div>
    </div>
  );
}

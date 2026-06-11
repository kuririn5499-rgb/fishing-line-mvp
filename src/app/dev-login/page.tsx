"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Account = { slug: string; name: string; boat_name: string | null };

const ROLES = [
  { value: "captain", label: "⚓ 船長", color: "bg-blue-600 hover:bg-blue-700" },
  { value: "customer", label: "🎣 お客様", color: "bg-green-600 hover:bg-green-700" },
  { value: "admin", label: "🛠️ 管理者", color: "bg-gray-600 hover:bg-gray-700" },
  { value: "staff", label: "👤 スタッフ", color: "bg-purple-600 hover:bg-purple-700" },
];

export default function DevLoginPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/dev")
      .then((r) => r.json())
      .then((d) => {
        setAccounts(d.accounts ?? []);
        if (d.accounts?.length > 0) setSelectedSlug(d.accounts[0].slug);
      })
      .catch(() => setError("アカウント一覧の取得に失敗しました"));
  }, []);

  const login = async (role: string) => {
    if (!selectedSlug) {
      setError("船を選択してください");
      return;
    }
    setLoading(role);
    setError(null);
    try {
      const res = await fetch("/api/auth/dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, slug: selectedSlug }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `エラー (${res.status})`);
        return;
      }
      router.push("/app");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "通信エラー");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="text-4xl mb-2">🛠️</div>
          <h1 className="text-lg font-bold text-gray-800">開発用ログイン</h1>
          <p className="text-xs text-gray-400 mt-1">本番環境では表示されません</p>
        </div>

        {/* 船選択 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">船を選択</label>
          {accounts.length === 0 ? (
            <p className="text-xs text-gray-400">読み込み中...</p>
          ) : (
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            >
              {accounts.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.boat_name ?? a.name}（{a.slug}）
                </option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700 break-all">
            {error}
          </div>
        )}

        {/* ロール選択ボタン */}
        <div className="space-y-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => login(r.value)}
              disabled={!!loading || !selectedSlug}
              className={`w-full py-3 px-4 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 ${r.color}`}
            >
              {loading === r.value ? "ログイン中..." : r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

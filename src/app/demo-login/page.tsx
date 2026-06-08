"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DemoLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    if (!password) {
      setError("パスワードを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, role: "captain" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `エラー (${res.status})`);
        return;
      }
      router.push("/captain");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🚢</div>
          <h1 className="text-lg font-bold text-gray-800">船ナビ デモ体験</h1>
          <p className="text-xs text-gray-400 mt-1">担当者からパスワードをお受け取りください</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="デモパスワード"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={login}
          disabled={loading}
          className="w-full py-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "ログイン中..." : "⚓ 船長としてデモを開始"}
        </button>
      </div>
    </div>
  );
}

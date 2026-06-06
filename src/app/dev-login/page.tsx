"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "captain", label: "船長 (captain)" },
  { value: "customer", label: "お客様 (customer)" },
  { value: "admin", label: "管理者 (admin)" },
  { value: "staff", label: "スタッフ (staff)" },
];

export default function DevLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const login = async (role: string) => {
    setLoading(role);
    setError(null);
    try {
      const res = await fetch("/api/auth/dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-xs space-y-5">
        <div className="text-center">
          <div className="text-4xl mb-2">🛠️</div>
          <h1 className="text-lg font-bold text-gray-800">開発用ログイン</h1>
          <p className="text-xs text-gray-400 mt-1">本番環境では表示されません</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700 break-all">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => login(r.value)}
              disabled={!!loading}
              className="w-full py-3 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              {loading === r.value ? "ログイン中..." : r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Account {
  id: string;
  slug: string;
  name: string;
  boat_name: string | null;
  liff_id_customer: string | null;
  liff_id_captain: string | null;
  line_channel_access_token: string | null;
  line_channel_secret: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
}

export default function SuperAdminPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/accounts")
      .then((r) => r.json())
      .then((d) => { setAccounts(d.accounts ?? []); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-800">遊漁船アカウント一覧</h2>
        <Link
          href="/superadmin/accounts/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700"
        >
          ＋ 新規追加
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">読み込み中...</p>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-400">アカウントがありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {a.is_active ? "稼働中" : "停止中"}
                    </span>
                    <p className="text-sm font-bold text-gray-800">{a.name}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">slug: {a.slug} {a.boat_name && `/ 船名: ${a.boat_name}`}</p>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-xs text-gray-400">
                      LIFF(客): {a.liff_id_customer ?? <span className="text-red-400">未設定</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      LIFF(船長): {a.liff_id_captain ?? <span className="text-red-400">未設定</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      LINE Token: {a.line_channel_access_token ? "✅ 設定済" : <span className="text-red-400">未設定</span>}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/superadmin/accounts/${a.id}`}
                  className="text-xs text-blue-600 hover:underline shrink-0"
                >
                  編集
                </Link>
              </div>
              {a.liff_id_customer && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-1">LIFF エンドポイント設定値</p>
                  <p className="text-xs font-mono bg-gray-50 px-2 py-1 rounded text-gray-700 break-all">
                    {typeof window !== "undefined" ? window.location.origin : ""}/customer?a={a.slug}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

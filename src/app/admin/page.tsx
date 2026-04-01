/**
 * /admin — 管理ダッシュボード
 */

import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  // 統計情報
  const [
    { count: userCount },
    { count: tripCount },
    { count: reservationCount },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("account_id", session.accountId),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("account_id", session.accountId),
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("account_id", session.accountId)
      .neq("status", "cancelled"),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-gray-800">管理ダッシュボード</h1>

      {/* 統計 */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-brand-600">{userCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">ユーザー</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-brand-600">{tripCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">便</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-brand-600">{reservationCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">予約</p>
        </Card>
      </div>

      {/* メニュー */}
      <div className="space-y-2">
        <Link href="/admin/users">
          <Card className="flex items-center gap-3 hover:shadow-md transition-shadow">
            <span className="text-2xl">👥</span>
            <div>
              <p className="text-sm font-medium">ユーザー管理</p>
              <p className="text-xs text-gray-500">role 変更・有効化・無効化</p>
            </div>
            <span className="ml-auto text-gray-400">→</span>
          </Card>
        </Link>
        <Link href="/admin/settings">
          <Card className="flex items-center gap-3 hover:shadow-md transition-shadow">
            <span className="text-2xl">⚙️</span>
            <div>
              <p className="text-sm font-medium">アカウント設定</p>
              <p className="text-xs text-gray-500">LINE設定・LIFF設定・Google Sheets</p>
            </div>
            <span className="ml-auto text-gray-400">→</span>
          </Card>
        </Link>
      </div>
    </div>
  );
}

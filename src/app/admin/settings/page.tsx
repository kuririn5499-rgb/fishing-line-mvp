/**
 * /admin/settings — アカウント設定
 * LINE・LIFF・Google Sheets の設定を表示する
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", session.accountId)
    .maybeSingle();

  if (!account) return null;

  const { data: boats } = await supabase
    .from("boats")
    .select("*")
    .eq("account_id", session.accountId)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-gray-800">アカウント設定</h1>

      {/* アカウント情報 */}
      <Card>
        <h2 className="text-sm font-bold text-gray-700 mb-3">アカウント情報</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-gray-500 w-28 shrink-0">アカウント名</dt>
            <dd className="font-medium">{account.name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 w-28 shrink-0">slug</dt>
            <dd className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
              {account.slug}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 w-28 shrink-0">LINE チャンネル</dt>
            <dd className="text-xs text-gray-600 truncate">
              {account.line_channel_id ?? "未設定"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 w-28 shrink-0">LIFF (customer)</dt>
            <dd className="text-xs text-gray-600 truncate">
              {account.liff_id_customer ?? "未設定"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 w-28 shrink-0">LIFF (captain)</dt>
            <dd className="text-xs text-gray-600 truncate">
              {account.liff_id_captain ?? "未設定"}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-gray-400 mt-4">
          ※ 設定の変更は管理者にお問い合わせください
        </p>
      </Card>

      {/* 船一覧 */}
      <Card>
        <h2 className="text-sm font-bold text-gray-700 mb-3">登録船舶</h2>
        {!boats || boats.length === 0 ? (
          <p className="text-sm text-gray-400">船舶が登録されていません</p>
        ) : (
          <ul className="space-y-2">
            {boats.map((boat) => (
              <li key={boat.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{boat.name}</p>
                  {boat.registration_number && (
                    <p className="text-xs text-gray-500">
                      登録番号: {boat.registration_number}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    boat.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {boat.is_active ? "有効" : "無効"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Google Sheets 設定 */}
      <Card>
        <h2 className="text-sm font-bold text-gray-700 mb-2">Google Sheets</h2>
        <p className="text-xs text-gray-500">
          スプレッドシート ID: {process.env.GOOGLE_SPREADSHEET_ID ? (
            <span className="font-mono bg-gray-100 px-1 rounded text-gray-700">
              設定済
            </span>
          ) : (
            <span className="text-red-400">未設定</span>
          )}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          シート構成: 乗船名簿 / 出船前検査 / 乗務記録
        </p>
      </Card>
    </div>
  );
}

/**
 * /captain/fishing-report — 釣果投稿
 * 釣果を入力して LINE 通知を配信する
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { FishingReportForm } from "@/components/forms/FishingReportForm";
import { Card } from "@/components/ui/Card";
import { todayJST } from "@/lib/repositories/utils";

export default async function FishingReportPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();
  const today = todayJST();

  // 過去7日〜今後30日のキャンセル以外の便（釣行後の投稿に対応）
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const until = new Date();
  until.setDate(until.getDate() + 30);
  const { data: trips } = await supabase
    .from("trips")
    .select("id, trip_date, departure_time, target_species, boats(name)")
    .eq("account_id", session.accountId)
    .gte("trip_date", since.toISOString().slice(0, 10))
    .lte("trip_date", until.toISOString().slice(0, 10))
    .neq("status", "cancelled")
    .order("trip_date", { ascending: false })
    .order("departure_time", { ascending: true });

  // account の LINE チャンネルアクセストークン
  const { data: account } = await supabase
    .from("accounts")
    .select("name, line_channel_id")
    .eq("id", session.accountId)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">釣果投稿</h1>
      <p className="text-xs text-gray-500">
        釣果を投稿すると、LINE 公式アカウントのフォロワーへ通知が送られます
      </p>

      {!trips || trips.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-6">
            釣果を投稿できる便がありません
          </p>
        </Card>
      ) : (
        <FishingReportForm
          trips={trips as unknown as { id: string; trip_date: string; departure_time: string | null; target_species: string | null; boats?: { name: string } | null }[]}
          boatName={account?.name ?? ""}
        />
      )}
    </div>
  );
}

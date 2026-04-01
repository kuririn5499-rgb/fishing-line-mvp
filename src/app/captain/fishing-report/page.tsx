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

  // 本日の完了 or confirmed 便
  const { data: trips } = await supabase
    .from("trips")
    .select("id, trip_date, departure_time, target_species, boats(name)")
    .eq("account_id", session.accountId)
    .eq("trip_date", today)
    .in("status", ["confirmed", "completed"]);

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
            本日の便がありません
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

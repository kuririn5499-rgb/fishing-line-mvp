/**
 * /customer/reports — 釣果・お知らせ一覧
 * 船長が投稿した釣果情報やお知らせを表示する
 * 画像は Supabase Storage から直接取得（image_urls 列不要）
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { MarkReportsAsRead } from "./MarkReportsAsRead";
import { ReportsCardList } from "./ReportsCardList";

export default async function CustomerReportsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  // メッセージログを取得（image_urls 列なし）
  const { data: logs } = await supabase
    .from("message_logs")
    .select("id, message_type, title, body, sent_at")
    .eq("account_id", session.accountId)
    .in("message_type", ["fishing_report", "announcement"])
    .order("sent_at", { ascending: false })
    .limit(30);

  // 釣果ログのタイトルから日付を抽出して trip_id を引く
  const fishingLogs = (logs ?? []).filter((l) => l.message_type === "fishing_report");
  const dates = [
    ...new Set(
      fishingLogs
        .map((l) => (l.title ?? "").replace("釣果情報 ", "").trim())
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    ),
  ];

  const tripDateMap = new Map<string, string>(); // trip_date → trip_id
  if (dates.length > 0) {
    const { data: trips } = await supabase
      .from("trips")
      .select("id, trip_date")
      .eq("account_id", session.accountId)
      .in("trip_date", dates);
    for (const t of trips ?? []) tripDateMap.set(t.trip_date, t.id);
  }

  // trip_id ごとに Storage ファイルを並列取得
  const imageMap = new Map<string, string[]>(); // trip_id → public URLs
  await Promise.all(
    Array.from(new Set(tripDateMap.values())).map(async (tripId) => {
      const { data: files } = await supabase.storage
        .from("fishing-reports")
        .list(`fishing-reports/${tripId}`, { limit: 10 });
      const urls = (files ?? [])
        .filter((f) => f.id !== null) // フォルダを除外
        .map((f) => {
          const { data } = supabase.storage
            .from("fishing-reports")
            .getPublicUrl(`fishing-reports/${tripId}/${f.name}`);
          return data.publicUrl;
        });
      if (urls.length > 0) imageMap.set(tripId, urls);
    })
  );

  // ログID → 画像URL[] のマップ
  const logImages = new Map<string, string[]>();
  for (const log of fishingLogs) {
    const date = (log.title ?? "").replace("釣果情報 ", "").trim();
    const tripId = tripDateMap.get(date);
    if (tripId) {
      const imgs = imageMap.get(tripId);
      if (imgs) logImages.set(log.id, imgs);
    }
  }

  return (
    <div className="space-y-4">
      <MarkReportsAsRead />
      <h1 className="text-lg font-bold text-gray-800">釣果・お知らせ</h1>

      {!logs || logs.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-8">
            まだ投稿はありません
          </p>
        </Card>
      ) : (
        <ReportsCardList
          logs={logs}
          logImages={Object.fromEntries(logImages)}
        />
      )}
    </div>
  );
}

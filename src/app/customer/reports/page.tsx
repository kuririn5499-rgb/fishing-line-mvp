import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { MarkReportsAsRead } from "./MarkReportsAsRead";
import { ReportsCardList } from "./ReportsCardList";

export default async function CustomerReportsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  const { data: logs } = await supabase
    .from("message_logs")
    .select("id, message_type, title, body, sent_at, image_urls")
    .eq("account_id", session.accountId)
    .in("message_type", ["fishing_report", "announcement"])
    .order("sent_at", { ascending: false })
    .limit(30);

  // image_urls を DB から直接使用（Storage フォルダ取得は廃止）
  const logImages: Record<string, string[]> = {};
  for (const log of logs ?? []) {
    if (log.image_urls?.length) {
      logImages[log.id] = log.image_urls;
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
        <ReportsCardList logs={logs} logImages={logImages} />
      )}
    </div>
  );
}

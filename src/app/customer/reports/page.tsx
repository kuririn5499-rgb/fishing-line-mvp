import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { MarkReportsAsRead } from "./MarkReportsAsRead";
import { ReportsCardList } from "./ReportsCardList";

export default async function CustomerReportsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  // 最終既読時刻を取得
  const { data: customerData } = await supabase
    .from("customers")
    .select("last_read_reports_at")
    .eq("user_id", session.userId)
    .eq("account_id", session.accountId)
    .maybeSingle();

  const lastReadAt = customerData?.last_read_reports_at ?? null;

  const { data: logs } = await supabase
    .from("message_logs")
    .select("id, message_type, title, body, sent_at, image_urls")
    .eq("account_id", session.accountId)
    .in("message_type", ["fishing_report", "announcement"])
    .order("sent_at", { ascending: false })
    .limit(30);

  const logImages: Record<string, string[]> = {};
  const unreadIds = new Set<string>();
  for (const log of logs ?? []) {
    if (log.image_urls?.length) {
      logImages[log.id] = log.image_urls;
    }
    if (!lastReadAt || log.sent_at > lastReadAt) {
      unreadIds.add(log.id);
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
          logImages={logImages}
          unreadIds={Array.from(unreadIds)}
        />
      )}
    </div>
  );
}

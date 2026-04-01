/**
 * /customer/points — ポイント残高・履歴
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";

export default async function CustomerPointsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, points")
    .eq("user_id", session.userId)
    .maybeSingle();

  const { data: logs } = customer
    ? await supabase
        .from("point_logs")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">ポイント</h1>

      {/* 残高 */}
      <Card className="text-center py-6">
        <p className="text-sm text-gray-500 mb-1">現在の残高</p>
        <p className="text-4xl font-bold text-brand-600">
          {(customer?.points ?? 0).toLocaleString()}
        </p>
        <p className="text-sm text-gray-500 mt-1">ポイント</p>
      </Card>

      {/* 履歴 */}
      <section>
        <h2 className="text-sm font-bold text-gray-600 mb-2">ポイント履歴</h2>
        {!logs || logs.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-400 text-center py-4">
              ポイント履歴はありません
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <Card key={log.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      {log.reason ?? "ポイント付与"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <span
                    className={`font-bold text-base ${
                      log.points_delta > 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {log.points_delta > 0 ? "+" : ""}
                    {log.points_delta.toLocaleString()} pt
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

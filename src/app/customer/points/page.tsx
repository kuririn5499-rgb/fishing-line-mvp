/**
 * /customer/points — ポイント残高・特典・履歴
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { PointRedeemButton } from "@/components/ui/PointRedeemButton";
import type { PointReward, RedemptionStatus } from "@/types";

const STATUS_LABEL: Record<RedemptionStatus, { label: string; cls: string }> = {
  pending:  { label: "確認待ち", cls: "bg-yellow-50 text-yellow-700" },
  approved: { label: "承認済み", cls: "bg-green-50 text-green-700" },
  rejected: { label: "却下",     cls: "bg-red-50 text-red-500" },
};

export default async function CustomerPointsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  const [
    { data: customer },
    { data: rewards },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, points")
      .eq("user_id", session.userId)
      .maybeSingle(),
    supabase
      .from("point_rewards")
      .select("*")
      .eq("account_id", session.accountId)
      .eq("is_active", true)
      .order("points_required", { ascending: true }),
  ]);

  const [{ data: logs }, { data: redemptions }] = await Promise.all([
    customer
      ? supabase
          .from("point_logs")
          .select("*")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
    customer
      ? supabase
          .from("point_redemptions")
          .select("id, points_used, status, created_at, point_rewards(title)")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  const currentPoints = customer?.points ?? 0;

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-gray-800">ポイント</h1>

      {/* 残高 */}
      <Card className="text-center py-6">
        <p className="text-sm text-gray-500 mb-1">現在の残高</p>
        <p className="text-5xl font-bold text-brand-600">
          {currentPoints.toLocaleString()}
        </p>
        <p className="text-sm text-gray-500 mt-1">ポイント</p>
      </Card>

      {/* 利用できる特典 */}
      <section>
        <h2 className="text-sm font-bold text-gray-600 mb-2">ポイント特典</h2>
        {!rewards || rewards.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-400 text-center py-4">現在、利用できる特典はありません</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {(rewards as PointReward[]).map((reward) => {
              const enough = currentPoints >= reward.points_required;
              return (
                <Card key={reward.id} className={enough ? "" : "opacity-60"}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{reward.title}</p>
                      {reward.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{reward.description}</p>
                      )}
                      <p className={`text-sm font-bold mt-1 ${enough ? "text-brand-600" : "text-gray-400"}`}>
                        {reward.points_required.toLocaleString()} pt
                      </p>
                    </div>
                    <PointRedeemButton
                      rewardId={reward.id}
                      rewardTitle={reward.title}
                      pointsRequired={reward.points_required}
                      currentPoints={currentPoints}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 申請履歴 */}
      {redemptions && redemptions.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-600 mb-2">申請履歴</h2>
          <div className="space-y-2">
            {redemptions.map((r) => {
              const reward = r.point_rewards as unknown as { title: string } | null;
              const s = STATUS_LABEL[r.status as RedemptionStatus];
              return (
                <Card key={r.id}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {reward?.title ?? "特典"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {r.points_used.toLocaleString()} pt 使用 ·{" "}
                        {new Date(r.created_at).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ポイント履歴 */}
      <section>
        <h2 className="text-sm font-bold text-gray-600 mb-2">獲得・消費履歴</h2>
        {!logs || logs.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-400 text-center py-4">履歴はありません</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <Card key={log.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">{log.reason ?? "ポイント付与"}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <span className={`font-bold text-base ${log.points_delta > 0 ? "text-green-600" : "text-red-500"}`}>
                    {log.points_delta > 0 ? "+" : ""}{log.points_delta.toLocaleString()} pt
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

/**
 * /captain/stats — 統計ダッシュボード
 * 過去6ヶ月の予約数・売上・乗船人数・稼働率を表示
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { formatPrice } from "@/lib/repositories/utils";

const COMMISSION_RATES: Record<string, number> = {
  normal: 0.05,
  bronze: 0.04,
  silver: 0.03,
  gold: 0.02,
  platinum: 0.01,
};

const COMMISSION_RANK_LABELS: Record<string, { name: string; rate: string }> = {
  normal:   { name: "ノーマル", rate: "5%" },
  bronze:   { name: "ブロンズ", rate: "4%" },
  silver:   { name: "シルバー", rate: "3%" },
  gold:     { name: "ゴールド", rate: "2%" },
  platinum: { name: "プラチナ", rate: "1%" },
};

function getMonthLabel(ym: string): string {
  const [, m] = ym.split("-");
  return `${parseInt(m)}月`;
}

function buildBarStyle(value: number, max: number): string {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return `${Math.max(pct, 2)}%`;
}

export default async function CaptainStatsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  // アカウントの手数料ランク取得
  const { data: accountData } = await supabase
    .from("accounts")
    .select("commission_rank")
    .eq("id", session.accountId)
    .single();

  const commissionRank = accountData?.commission_rank ?? "normal";
  const commissionRate = COMMISSION_RATES[commissionRank] ?? 0.05;
  const rankInfo = COMMISSION_RANK_LABELS[commissionRank] ?? { name: "ノーマル", rate: "5%" };

  // 過去6ヶ月の範囲
  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - 5);
  from.setDate(1);
  const fromStr = from.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  // 便一覧（過去6ヶ月）
  const { data: trips } = await supabase
    .from("trips")
    .select("id, trip_date, capacity, status, price_per_person")
    .eq("account_id", session.accountId)
    .gte("trip_date", fromStr)
    .lte("trip_date", todayStr)
    .not("status", "in", '("cancelled","closed")');

  const tripIds = (trips ?? []).map((t) => t.id);

  // 予約一覧（キャンセル以外）
  const { data: reservations } = tripIds.length > 0
    ? await supabase
        .from("reservations")
        .select("trip_id, passengers_count, discount_amount")
        .in("trip_id", tripIds)
        .neq("status", "cancelled")
    : { data: [] };

  // 便の trip_date を引けるように Map
  const tripDateMap = new Map((trips ?? []).map((t) => [t.id, t]));

  // 月ごとに集計
  type MonthStats = {
    ym: string;
    reservations: number;
    passengers: number;
    revenue: number;
    trips: number;
  };

  const byMonth = new Map<string, MonthStats>();

  // 6ヶ月分の初期値を作成
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const ym = d.toISOString().slice(0, 7);
    byMonth.set(ym, { ym, reservations: 0, passengers: 0, revenue: 0, trips: 0 });
  }

  // 便数を集計
  for (const trip of trips ?? []) {
    const ym = trip.trip_date.slice(0, 7);
    if (!byMonth.has(ym)) continue;
    byMonth.get(ym)!.trips += 1;
  }

  // 予約を集計
  for (const r of reservations ?? []) {
    const trip = tripDateMap.get(r.trip_id);
    if (!trip) continue;
    const ym = trip.trip_date.slice(0, 7);
    if (!byMonth.has(ym)) continue;

    const stats = byMonth.get(ym)!;
    stats.reservations += 1;
    stats.passengers += r.passengers_count ?? 0;

    if (trip.price_per_person != null) {
      const gross = trip.price_per_person * (r.passengers_count ?? 0);
      const discount = r.discount_amount ?? 0;
      stats.revenue += gross - discount;
    }
  }

  const months = Array.from(byMonth.values());
  const currentMonth = now.toISOString().slice(0, 7);
  const current = byMonth.get(currentMonth) ?? { reservations: 0, passengers: 0, revenue: 0, trips: 0, ym: currentMonth };

  // 累計
  const total = months.reduce(
    (acc, m) => ({
      reservations: acc.reservations + m.reservations,
      passengers: acc.passengers + m.passengers,
      revenue: acc.revenue + m.revenue,
      trips: acc.trips + m.trips,
    }),
    { reservations: 0, passengers: 0, revenue: 0, trips: 0 }
  );

  const maxRevenue = Math.max(...months.map((m) => m.revenue), 1);
  const maxPassengers = Math.max(...months.map((m) => m.passengers), 1);
  const maxTrips = Math.max(...months.map((m) => m.trips), 1);

  const currentFee = Math.floor(current.revenue * commissionRate);
  const totalFee = Math.floor(total.revenue * commissionRate);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-gray-800">統計</h1>

      {/* 今月サマリー */}
      <section>
        <h2 className="text-sm font-bold text-gray-600 mb-2">今月</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "便数", value: `${current.trips}便` },
            { label: "予約件数", value: `${current.reservations}件` },
            { label: "乗船人数", value: `${current.passengers}名` },
            { label: "売上", value: current.revenue > 0 ? formatPrice(current.revenue) : "—" },
          ].map((item) => (
            <Card key={item.label} className="text-center py-3">
              <p className="text-xl font-bold text-brand-600">{item.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
            </Card>
          ))}
        </div>
        {current.revenue > 0 && (
          <Card className="mt-3 bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 font-medium">船ナビ手数料（今月）</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  ランク：{rankInfo.name}（{rankInfo.rate}）
                </p>
              </div>
              <p className="text-lg font-bold text-amber-800">{formatPrice(currentFee)}</p>
            </div>
          </Card>
        )}
      </section>

      {/* 6ヶ月累計 */}
      <section>
        <h2 className="text-sm font-bold text-gray-600 mb-2">過去6ヶ月 合計</h2>
        <Card>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            <div>
              <p className="text-xs text-gray-400">便数</p>
              <p className="text-base font-bold text-gray-800">{total.trips}便</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">予約件数</p>
              <p className="text-base font-bold text-gray-800">{total.reservations}件</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">乗船人数</p>
              <p className="text-base font-bold text-gray-800">{total.passengers}名</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">売上合計</p>
              <p className="text-base font-bold text-gray-800">
                {total.revenue > 0 ? formatPrice(total.revenue) : "—"}
              </p>
            </div>
            {total.revenue > 0 && (
              <div className="col-span-2 border-t border-amber-100 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-700 font-medium">船ナビ手数料（6ヶ月累計）</p>
                    <p className="text-xs text-amber-500">{rankInfo.name}ランク {rankInfo.rate}</p>
                  </div>
                  <p className="text-base font-bold text-amber-700">{formatPrice(totalFee)}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* 月別グラフ：売上 */}
      {total.revenue > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-600 mb-3">月別売上</h2>
          <Card>
            <div className="flex items-end gap-1.5 h-28">
              {months.map((m) => (
                <div key={m.ym} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
                    <div
                      className="w-full rounded-t-md bg-brand-400 transition-all"
                      style={{ height: buildBarStyle(m.revenue, maxRevenue) }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 leading-none">{getMonthLabel(m.ym)}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* 月別グラフ：乗船人数 */}
      {total.passengers > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-600 mb-3">月別乗船人数</h2>
          <Card>
            <div className="flex items-end gap-1.5 h-28">
              {months.map((m) => (
                <div key={m.ym} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
                    <div
                      className="w-full rounded-t-md bg-sea-400 transition-all"
                      style={{ height: buildBarStyle(m.passengers, maxPassengers) }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 leading-none">{getMonthLabel(m.ym)}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* 月別表 */}
      <section>
        <h2 className="text-sm font-bold text-gray-600 mb-2">月別詳細</h2>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-3 py-2.5 text-gray-500 font-medium">月</th>
                <th className="text-right px-3 py-2.5 text-gray-500 font-medium">便</th>
                <th className="text-right px-3 py-2.5 text-gray-500 font-medium">予約</th>
                <th className="text-right px-3 py-2.5 text-gray-500 font-medium">人数</th>
                <th className="text-right px-3 py-2.5 text-gray-500 font-medium">売上</th>
                <th className="text-right px-3 py-2.5 text-amber-500 font-medium">手数料</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => {
                const fee = Math.floor(m.revenue * commissionRate);
                return (
                  <tr key={m.ym} className={`border-b border-gray-50 last:border-0 ${m.ym === currentMonth ? "bg-brand-50" : ""}`}>
                    <td className="px-3 py-2 font-medium text-gray-700">{getMonthLabel(m.ym)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{m.trips}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{m.reservations}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{m.passengers}</td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {m.revenue > 0 ? formatPrice(m.revenue) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-amber-600">
                      {m.revenue > 0 ? formatPrice(fee) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

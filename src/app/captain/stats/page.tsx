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

const RANK_INFO: Record<string, { name: string; rate: string; cardBg: string; cardBorder: string; labelClass: string; amountClass: string; platinumGradient?: boolean }> = {
  normal:   { name: "ノーマル", rate: "5%", cardBg: "bg-gray-50",   cardBorder: "border-gray-200",  labelClass: "text-gray-700",   amountClass: "text-gray-900" },
  bronze:   { name: "ブロンズ", rate: "4%", cardBg: "bg-amber-50",  cardBorder: "border-amber-300", labelClass: "text-amber-800",  amountClass: "text-amber-800" },
  silver:   { name: "シルバー", rate: "3%", cardBg: "bg-slate-50",  cardBorder: "border-slate-300", labelClass: "text-slate-500",  amountClass: "text-slate-600" },
  gold:     { name: "ゴールド", rate: "2%", cardBg: "bg-yellow-50", cardBorder: "border-yellow-300",labelClass: "text-yellow-700", amountClass: "text-yellow-600" },
  platinum: { name: "プラチナ", rate: "1%", cardBg: "bg-slate-50",  cardBorder: "border-slate-300", labelClass: "text-slate-500",  amountClass: "", platinumGradient: true },
};

const platinumTextStyle = {
  background: "linear-gradient(120deg, #94a3b8 0%, #e2e8f0 45%, #64748b 100%)",
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent" as const,
  backgroundClip: "text" as const,
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
  const rankInfo = RANK_INFO[commissionRank] ?? RANK_INFO.normal;

  // 過去6ヶ月の範囲
  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - 5);
  from.setDate(1);
  const fromStr = from.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  // 登録済みプランタグ（登録順）
  const { data: registeredMethodTags } = await supabase
    .from("fishing_tags")
    .select("name")
    .eq("account_id", session.accountId)
    .eq("tag_type", "method")
    .order("created_at", { ascending: true });

  // 顧客セグメント（全期間）
  const { data: allReservations } = await supabase
    .from("reservations")
    .select("customer_id")
    .eq("account_id", session.accountId)
    .neq("status", "cancelled")
    .not("customer_id", "is", null);

  const customerCounts = new Map<string, number>();
  for (const r of allReservations ?? []) {
    const cid = r.customer_id as string;
    customerCounts.set(cid, (customerCounts.get(cid) ?? 0) + 1);
  }
  let segNew = 0, segRepeat = 0, segRegular = 0;
  for (const count of customerCounts.values()) {
    if (count === 1) segNew++;
    else if (count <= 4) segRepeat++;
    else segRegular++;
  }
  const segTotal = customerCounts.size;

  // 便一覧（過去6ヶ月）
  const { data: trips } = await supabase
    .from("trips")
    .select("id, trip_date, capacity, status, price_per_person, fishing_method, location")
    .eq("account_id", session.accountId)
    .gte("trip_date", fromStr)
    .lte("trip_date", todayStr)
    .not("status", "in", '("cancelled","closed")');

  const tripIds = (trips ?? []).map((t) => t.id);

  // 予約一覧（キャンセル以外）
  const { data: reservations } = tripIds.length > 0
    ? await supabase
        .from("reservations")
        .select("trip_id, passengers_count, discount_amount, customer_id")
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

  // 釣り方・場所別集計
  type TagStats = { passengers: number; reservations: number };
  const methodStats = new Map<string, TagStats>();
  const locationStats = new Map<string, TagStats>();

  for (const r of reservations ?? []) {
    const trip = tripDateMap.get(r.trip_id);
    if (!trip) continue;
    const pax = r.passengers_count ?? 0;
    const method = (trip as Record<string, unknown>).fishing_method as string | null | undefined;
    const loc = (trip as Record<string, unknown>).location as string | null | undefined;
    if (method) {
      const s = methodStats.get(method) ?? { passengers: 0, reservations: 0 };
      s.passengers += pax; s.reservations += 1;
      methodStats.set(method, s);
    }
    if (loc) {
      const s = locationStats.get(loc) ?? { passengers: 0, reservations: 0 };
      s.passengers += pax; s.reservations += 1;
      locationStats.set(loc, s);
    }
  }

  const methodEntries = Array.from(methodStats.entries()).sort((a, b) => b[1].passengers - a[1].passengers);
  const locationEntries = Array.from(locationStats.entries()).sort((a, b) => b[1].passengers - a[1].passengers);
  const maxMethodPax = Math.max(...methodEntries.map(([, s]) => s.passengers), 1);
  const maxLocationPax = Math.max(...locationEntries.map(([, s]) => s.passengers), 1);

  // プラン別顧客セグメント（新規/リピーター/常連）
  const planCustomers = new Map<string, Set<string>>();
  for (const r of reservations ?? []) {
    const trip = tripDateMap.get(r.trip_id);
    if (!trip) continue;
    const plan = (trip as Record<string, unknown>).fishing_method as string | null | undefined;
    if (!plan) continue;
    const custId = (r as { customer_id?: string | null }).customer_id;
    if (!custId) continue;
    if (!planCustomers.has(plan)) planCustomers.set(plan, new Set());
    planCustomers.get(plan)!.add(custId);
  }
  function computePlanSeg(customers: Set<string>) {
    let newC = 0, repeatC = 0, regularC = 0;
    for (const custId of customers) {
      const count = customerCounts.get(custId) ?? 1;
      if (count === 1) newC++; else if (count <= 4) repeatC++; else regularC++;
    }
    return { newC, repeatC, regularC, total: customers.size };
  }

  const regNames = new Set((registeredMethodTags ?? []).map((t) => t.name));

  const planSegEntries = [
    // 登録済みタグ（登録順）― データなしの場合は0
    ...(registeredMethodTags ?? []).map(({ name }) => {
      const customers = planCustomers.get(name);
      if (!customers) return { plan: name, newC: 0, repeatC: 0, regularC: 0, total: 0 };
      return { plan: name, ...computePlanSeg(customers) };
    }),
    // 未登録のフリーテキストプラン（データあり分のみ、件数降順）
    ...Array.from(planCustomers.entries())
      .filter(([name]) => !regNames.has(name))
      .map(([name, customers]) => ({ plan: name, ...computePlanSeg(customers) }))
      .sort((a, b) => b.total - a.total),
  ];

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
          <Card className={`mt-3 ${rankInfo.cardBg} border ${rankInfo.cardBorder}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${rankInfo.labelClass}`}>船ナビ手数料（今月）</p>
                <p className={`text-xs mt-0.5 ${rankInfo.labelClass}`}>
                  ランク：
                  {rankInfo.platinumGradient ? (
                    <span style={platinumTextStyle} className="font-bold">{rankInfo.name}（{rankInfo.rate}）</span>
                  ) : (
                    <span className={`font-bold ${rankInfo.amountClass}`}>{rankInfo.name}（{rankInfo.rate}）</span>
                  )}
                </p>
              </div>
              {rankInfo.platinumGradient ? (
                <p className="text-lg font-bold" style={platinumTextStyle}>{formatPrice(currentFee)}</p>
              ) : (
                <p className={`text-lg font-bold ${rankInfo.amountClass}`}>{formatPrice(currentFee)}</p>
              )}
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
          </div>
        </Card>
      </section>

      {/* 顧客セグメント */}
      {segTotal > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-600 mb-2">顧客セグメント（全期間）</h2>
          <Card>
            <p className="text-xs text-gray-400 mb-3">累計 {segTotal}名</p>
            {[
              { label: "新規",     sub: "1回",   count: segNew,     hex: "#38bdf8" },
              { label: "リピーター", sub: "2〜4回", count: segRepeat,  hex: "#4ade80" },
              { label: "常連",     sub: "5回以上", count: segRegular, hex: "#fbbf24" },
            ].map(({ label, sub, count, hex }) => {
              const pct = segTotal > 0 ? Math.round((count / segTotal) * 100) : 0;
              return (
                <div key={label} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                      <span className="text-xs text-gray-400">{sub}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-800">{count}名
                      <span className="text-xs font-normal text-gray-400 ml-1">（{pct}%）</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`, backgroundColor: hex }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* 釣り方別集計 */}
      {methodEntries.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-600 mb-2">プラン別（過去6ヶ月）</h2>
          <Card>
            {methodEntries.map(([name, s]) => {
              const pct = Math.round((s.passengers / maxMethodPax) * 100);
              return (
                <div key={name} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{name}</span>
                    <span className="text-sm font-bold text-gray-800">
                      {s.passengers}名
                      <span className="text-xs font-normal text-gray-400 ml-1">/ {s.reservations}件</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`, backgroundColor: "#38bdf8" }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* プラン別顧客セグメント */}
      {(registeredMethodTags ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-600 mb-2">プラン別顧客セグメント（過去6ヶ月）</h2>
          <Card>
            {planSegEntries.map(({ plan, newC, repeatC, regularC, total }) => {
              const newPct  = total > 0 ? Math.round((newC     / total) * 100) : 0;
              const repPct  = total > 0 ? Math.round((repeatC  / total) * 100) : 0;
              const regPct  = total > 0 ? Math.round((regularC / total) * 100) : 0;
              return (
                <div key={plan} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{plan}</span>
                    <span className="text-xs text-gray-400">{total}名</span>
                  </div>
                  <div className="flex w-full h-3 rounded-full overflow-hidden bg-gray-100">
                    {newPct  > 0 && <div style={{ width: `${newPct}%`,  backgroundColor: "#38bdf8" }} />}
                    {repPct  > 0 && <div style={{ width: `${repPct}%`,  backgroundColor: "#4ade80" }} />}
                    {regPct  > 0 && <div style={{ width: `${regPct}%`,  backgroundColor: "#fbbf24" }} />}
                  </div>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {newC     > 0 && <span className="text-xs" style={{ color: "#38bdf8" }}>新規 {newC}名</span>}
                    {repeatC  > 0 && <span className="text-xs" style={{ color: "#4ade80" }}>リピーター {repeatC}名</span>}
                    {regularC > 0 && <span className="text-xs" style={{ color: "#fbbf24" }}>常連 {regularC}名</span>}
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* 場所別集計 */}
      {locationEntries.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-600 mb-2">場所別（過去6ヶ月）</h2>
          <Card>
            {locationEntries.map(([name, s]) => {
              const pct = Math.round((s.passengers / maxLocationPax) * 100);
              return (
                <div key={name} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{name}</span>
                    <span className="text-sm font-bold text-gray-800">
                      {s.passengers}名
                      <span className="text-xs font-normal text-gray-400 ml-1">/ {s.reservations}件</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`, backgroundColor: "#4ade80" }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      )}

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
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.ym} className={`border-b border-gray-50 last:border-0 ${m.ym === currentMonth ? "bg-brand-50" : ""}`}>
                  <td className="px-3 py-2 font-medium text-gray-700">{getMonthLabel(m.ym)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{m.trips}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{m.reservations}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{m.passengers}</td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {m.revenue > 0 ? formatPrice(m.revenue) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

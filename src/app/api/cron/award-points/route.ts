/**
 * POST /api/cron/award-points
 * Vercel Cron から毎日 0:00 JST（= 15:00 UTC）に呼ばれる
 *
 * 対象: trip_date が昨日以前、便キャンセルなし、予約キャンセルなし
 * 処理: 1予約 = 1ポイント付与 + boarding_count +1
 * 冪等: point_logs.reservation_id で二重付与を防止
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { todayJST } from "@/lib/repositories/utils";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Vercel Cron は Authorization: Bearer <CRON_SECRET> を付与する
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const today = todayJST();

  // 直近7日分（cron が止まっていた場合もキャッチアップ）
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);
  const from = fromDate.toISOString().slice(0, 10);

  // 対象便: キャンセルされていない、過去の便
  const { data: trips } = await supabase
    .from("trips")
    .select("id, account_id")
    .lt("trip_date", today)
    .gte("trip_date", from)
    .neq("status", "cancelled");

  if (!trips || trips.length === 0) {
    return NextResponse.json({ awarded: 0, message: "対象便なし" });
  }

  const tripIds = trips.map((t) => t.id);

  // 対象予約: キャンセルされておらず customer_id が紐付いている
  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, customer_id, account_id")
    .in("trip_id", tripIds)
    .neq("status", "cancelled")
    .not("customer_id", "is", null);

  if (!reservations || reservations.length === 0) {
    return NextResponse.json({ awarded: 0, message: "対象予約なし" });
  }

  // すでにポイント付与済みの reservation_id を取得
  const { data: existingLogs } = await supabase
    .from("point_logs")
    .select("reservation_id")
    .in("reservation_id", reservations.map((r) => r.id))
    .gt("points_delta", 0);

  const awarded = new Set((existingLogs ?? []).map((l) => l.reservation_id));

  // 未付与の予約のみ処理
  const toAward = reservations.filter((r) => r.customer_id && !awarded.has(r.id));

  if (toAward.length === 0) {
    return NextResponse.json({ awarded: 0, message: "付与済み" });
  }

  // customer_id 単位でまとめる
  type Entry = { accountId: string; reservationIds: string[] };
  const byCustomer = new Map<string, Entry>();
  for (const r of toAward) {
    const cid = r.customer_id as string;
    if (!byCustomer.has(cid)) {
      byCustomer.set(cid, { accountId: r.account_id, reservationIds: [] });
    }
    byCustomer.get(cid)!.reservationIds.push(r.id);
  }

  let totalAwarded = 0;

  for (const [customerId, { accountId, reservationIds }] of byCustomer) {
    const pts = reservationIds.length; // 1件 = 1ポイント

    // 現在の乗船回数を取得
    const { data: customer } = await supabase
      .from("customers")
      .select("boarding_count")
      .eq("id", customerId)
      .maybeSingle();

    if (!customer) continue;

    // points は既存の RPC で原子的に加算（競合安全）
    await supabase.rpc("increment_customer_points", { p_customer_id: customerId, p_delta: pts });

    // boarding_count を更新
    await supabase
      .from("customers")
      .update({ boarding_count: customer.boarding_count + pts })
      .eq("id", customerId);

    // 予約ごとに point_log を記録（reservation_id で冪等性を保証）
    const { error: logErr } = await supabase.from("point_logs").insert(
      reservationIds.map((rid) => ({
        account_id: accountId,
        customer_id: customerId,
        reservation_id: rid,
        points_delta: 1,
        reason: "乗船ポイント",
      }))
    );
    if (logErr) {
      console.error(`[cron/award-points] point_log 挿入失敗 customer=${customerId}:`, logErr);
    }

    totalAwarded += pts;
  }

  console.log(`[cron/award-points] ${totalAwarded} pt 付与（${byCustomer.size} 名）`);
  return NextResponse.json({
    awarded: totalAwarded,
    customers: byCustomer.size,
  });
}

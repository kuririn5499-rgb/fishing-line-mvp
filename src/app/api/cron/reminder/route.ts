/**
 * POST /api/cron/reminder
 * 翌日の便の予約者に LINE でリマインダーを送る
 * Vercel Cron から毎日 10:00 UTC（= 19:00 JST）に呼ばれる
 * 冪等性: message_logs の trip_id（body列）で二重送信を防止
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { sendPushMessage, buildReminderMessage } from "@/lib/line-messaging";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  // 明日の日付を JST で計算
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const tomorrowJST = new Date(nowJST);
  tomorrowJST.setDate(tomorrowJST.getDate() + 1);
  const tomorrow = tomorrowJST.toISOString().slice(0, 10);
  const todayStr = nowJST.toISOString().slice(0, 10);

  // 明日の便を取得（キャンセル・休船・完了以外）
  const { data: trips } = await supabase
    .from("trips")
    .select("id, account_id, trip_date, departure_time, target_species")
    .eq("trip_date", tomorrow)
    .not("status", "in", '("cancelled","closed","completed")');

  if (!trips || trips.length === 0) {
    return NextResponse.json({ sent: 0, message: "明日の便なし" });
  }

  // 今日すでにリマインダーを送った trip_id を確認
  const tripIds = trips.map((t) => t.id);
  const { data: sentLogs } = await supabase
    .from("message_logs")
    .select("body")
    .eq("message_type", "reminder")
    .in("body", tripIds)
    .gte("sent_at", `${todayStr}T00:00:00Z`);

  const alreadySent = new Set((sentLogs ?? []).map((l) => l.body).filter(Boolean));

  // アカウントごとにグループ化
  const byAccount = new Map<string, typeof trips[number][]>();
  for (const trip of trips) {
    if (alreadySent.has(trip.id)) continue;
    if (!byAccount.has(trip.account_id)) byAccount.set(trip.account_id, []);
    byAccount.get(trip.account_id)!.push(trip);
  }

  let totalSent = 0;

  for (const [accountId, accountTrips] of byAccount) {
    const { data: account } = await supabase
      .from("accounts")
      .select("name, boat_name, line_channel_access_token, liff_id_customer")
      .eq("id", accountId)
      .maybeSingle();

    if (!account?.line_channel_access_token) continue;
    const { data: nfRem } = await supabase.from("accounts").select("notify_line_reminder").eq("id", accountId).maybeSingle();
    if ((nfRem as { notify_line_reminder?: boolean } | null)?.notify_line_reminder === false) continue;

    const token = account.line_channel_access_token;
    const boatName = account.boat_name ?? account.name ?? "船長";
    const liffUrl = account.liff_id_customer
      ? `https://liff.line.me/${account.liff_id_customer}`
      : "";

    for (const trip of accountTrips) {
      // 予約者を取得
      const { data: reservations } = await supabase
        .from("reservations")
        .select("customer_id")
        .eq("trip_id", trip.id)
        .in("status", ["pending", "confirmed"]);

      const customerIds = (reservations ?? [])
        .map((r) => r.customer_id)
        .filter((id): id is string => !!id);

      if (customerIds.length === 0) {
        // 予約者がいなくても送信ログを記録してスキップ
        await supabase.from("message_logs").insert({
          account_id: accountId,
          message_type: "reminder",
          title: `リマインダー ${trip.trip_date}`,
          body: trip.id,
          sent_at: new Date().toISOString(),
        });
        continue;
      }

      // customer → user → line_user_id を解決
      const { data: customers } = await supabase
        .from("customers")
        .select("user_id")
        .in("id", customerIds)
        .not("user_id", "is", null);

      const userIds = (customers ?? [])
        .map((c) => c.user_id)
        .filter((id): id is string => !!id);

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("line_user_id")
          .in("id", userIds)
          .not("line_user_id", "is", null);

        const messages = buildReminderMessage({
          boatName,
          tripDate: trip.trip_date,
          departureTime: trip.departure_time,
          targetSpecies: trip.target_species,
          liffUrl,
        });

        for (const user of users ?? []) {
          if (!user.line_user_id) continue;
          try {
            await sendPushMessage(token, user.line_user_id, messages);
            totalSent++;
          } catch (e) {
            console.error(`[cron/reminder] LINE送信失敗 ${user.line_user_id}:`, e);
          }
        }
      }

      // 送信済みログを記録（冪等性）
      await supabase.from("message_logs").insert({
        account_id: accountId,
        message_type: "reminder",
        title: `リマインダー ${trip.trip_date}`,
        body: trip.id,
        sent_at: new Date().toISOString(),
      });
    }
  }

  console.log(`[cron/reminder] ${totalSent}件送信 / 対象便=${trips.length}`);
  return NextResponse.json({ sent: totalSent, trips: trips.length });
}

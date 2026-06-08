/**
 * POST /api/trips/[id]/departure-notice
 * 出船判断を確定し、予約者全員にLINE通知を送る
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { DepartureNoticeSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase";
import { sendPushMessage } from "@/lib/line-messaging";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");

    const { id: tripId } = await params;
    const body = await req.json();

    const parsed = DepartureNoticeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { judgement, cancel_reason } = parsed.data;
    const supabase = createServerSupabaseClient();

    // 便情報を取得（自アカウントのみ）
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("*, boats(name)")
      .eq("id", tripId)
      .eq("account_id", session.accountId)
      .single();

    if (tripErr || !trip) {
      return NextResponse.json({ error: "便が見つかりません" }, { status: 404 });
    }

    // 出船判断を pre_departure_checks に保存（upsert）
    await supabase.from("pre_departure_checks").upsert(
      {
        account_id: trip.account_id,
        trip_id: tripId,
        departure_judgement: judgement,
        cancel_reason: cancel_reason ?? null,
        checked_at: new Date().toISOString(),
      },
      { onConflict: "trip_id" }
    );

    // アクティブな予約者の LINE user ID を取得（FK結合に依存しない段階クエリ）
    const { data: reservations, error: reservationsErr } = await supabase
      .from("reservations")
      .select("customer_id")
      .eq("trip_id", tripId)
      .in("status", ["pending", "confirmed"]);

    if (reservationsErr) {
      console.error("[departure-notice] reservations取得エラー:", reservationsErr);
    }

    const customerIds = (reservations ?? [])
      .map((r) => r.customer_id)
      .filter((id): id is string => !!id);

    const lineUserIds: string[] = [];

    if (customerIds.length > 0) {
      const { data: customers, error: customersErr } = await supabase
        .from("customers")
        .select("user_id")
        .in("id", customerIds)
        .not("user_id", "is", null);

      if (customersErr) {
        console.error("[departure-notice] customers取得エラー:", customersErr);
      }

      const userIds = (customers ?? [])
        .map((c) => c.user_id)
        .filter((id): id is string => !!id);

      if (userIds.length > 0) {
        const { data: users, error: usersErr } = await supabase
          .from("users")
          .select("line_user_id")
          .in("id", userIds)
          .not("line_user_id", "is", null);

        if (usersErr) {
          console.error("[departure-notice] users取得エラー:", usersErr);
        }

        for (const u of users ?? []) {
          if (u.line_user_id) lineUserIds.push(u.line_user_id);
        }
      }
    }

    console.log(`[departure-notice] tripId=${tripId} 予約数=${reservations?.length ?? 0} LINE通知対象=${lineUserIds.length}名`);

    // メッセージ生成
    const boatName = (trip.boats as { name: string } | null)?.name ?? "長崎丸";
    const departureTime = trip.departure_time
      ? trip.departure_time.slice(0, 5)
      : "";
    const species = trip.target_species ?? trip.trip_type ?? "";

    const judgeText =
      judgement === "go"
        ? "出船します🚢"
        : `出船中止となりました🙏`;

    let messageText =
      `【${boatName}】\n` +
      `${trip.trip_date}${departureTime ? ` ${departureTime}` : ""}からの` +
      `${species ? `${species}釣りは` : "便は"}` +
      judgeText;

    if (judgement === "cancel" && cancel_reason) {
      messageText += `\n\n理由：${cancel_reason}`;
    }

    // アカウントの LINE トークンを取得（DB 優先、env fallback）
    const { data: accountData } = await supabase
      .from("accounts")
      .select("line_channel_access_token")
      .eq("id", trip.account_id)
      .single();

    const token = accountData?.line_channel_access_token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
    let sentCount = 0;
    for (const lineUserId of lineUserIds) {
      try {
        await sendPushMessage(token, lineUserId, [
          { type: "text", text: messageText },
        ]);
        sentCount++;
      } catch (e) {
        console.error(`[departure-notice] LINE送信失敗 ${lineUserId}:`, e);
      }
    }

    // メッセージログに記録
    await supabase.from("message_logs").insert({
      account_id: trip.account_id,
      message_type: "departure_notice",
      title: `出船${judgement === "go" ? "" : "中止"}通知`,
      body: messageText,
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, sentCount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

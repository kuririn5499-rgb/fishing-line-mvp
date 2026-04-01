/**
 * POST /api/fishing-report
 * 釣果を乗務記録に保存し、LINE Broadcast で配信する
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import {
  buildFishingReportMessage,
  sendBroadcastMessage,
} from "@/lib/line-messaging";
import { z } from "zod";

const Schema = z.object({
  trip_id: z.string().uuid(),
  catch_summary: z.string().min(1).max(500),
  has_vacancy: z.boolean(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const body = await req.json();

    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { trip_id, catch_summary, has_vacancy } = parsed.data;

    const supabase = createServerSupabaseClient();

    // 便情報を取得
    const { data: trip } = await supabase
      .from("trips")
      .select("trip_date, boats(name)")
      .eq("id", trip_id)
      .eq("account_id", session.accountId)
      .maybeSingle();

    if (!trip) {
      return NextResponse.json({ error: "便が見つかりません" }, { status: 404 });
    }

    // 乗務記録の catch_summary を更新
    await supabase
      .from("duty_logs")
      .update({ catch_summary, updated_at: new Date().toISOString() })
      .eq("trip_id", trip_id);

    // message_logs に保存
    const messages = buildFishingReportMessage({
      boatName: (() => { const b = trip.boats as unknown as { name: string } | { name: string }[] | null; return (Array.isArray(b) ? b[0]?.name : b?.name) ?? "—"; })(),
      tripDate: trip.trip_date,
      catchSummary: catch_summary,
      hasVacancy: has_vacancy,
    });

    await supabase.from("message_logs").insert({
      account_id: session.accountId,
      user_id: session.userId,
      message_type: "fishing_report",
      title: `釣果情報 ${trip.trip_date}`,
      body: catch_summary,
      sent_at: new Date().toISOString(),
    });

    // LINE Broadcast 送信（チャンネルアクセストークンが設定されている場合）
    const { data: account } = await supabase
      .from("accounts")
      .select("line_channel_id")
      .eq("id", session.accountId)
      .maybeSingle();

    const token = account?.line_channel_id;
    if (token) {
      await sendBroadcastMessage(token, messages);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

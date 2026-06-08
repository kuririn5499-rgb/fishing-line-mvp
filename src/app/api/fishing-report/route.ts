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
  image_urls: z.array(z.string().url()).max(2).optional(),
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

    const { trip_id, catch_summary, has_vacancy, image_urls } = parsed.data;

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

    // 乗務記録の catch_summary を保存（記録がなければ作成）
    await supabase
      .from("duty_logs")
      .upsert(
        { trip_id, account_id: session.accountId, catch_summary, recorded_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: "trip_id" }
      );

    // image_urls を duty_logs にも保存（更新）
    if (image_urls && image_urls.length > 0) {
      await supabase
        .from("duty_logs")
        .update({ image_urls, updated_at: new Date().toISOString() })
        .eq("trip_id", trip_id)
        .eq("account_id", session.accountId);
    }

    // message_logs に保存
    const messages = buildFishingReportMessage({
      boatName: (() => { const b = trip.boats as unknown as { name: string } | { name: string }[] | null; return (Array.isArray(b) ? b[0]?.name : b?.name) ?? "—"; })(),
      tripDate: trip.trip_date,
      catchSummary: catch_summary,
      hasVacancy: has_vacancy,
      imageUrls: image_urls,
    });

    await supabase.from("message_logs").insert({
      account_id: session.accountId,
      user_id: session.userId,
      message_type: "fishing_report",
      title: `釣果情報 ${trip.trip_date}`,
      body: catch_summary,
      image_urls: image_urls ?? [],
      sent_at: new Date().toISOString(),
    });

    // LINE Broadcast 送信（チャンネルアクセストークンが設定されている場合）
    const { data: account } = await supabase
      .from("accounts")
      .select("line_channel_access_token")
      .eq("id", session.accountId)
      .maybeSingle();

    const token = account?.line_channel_access_token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN;
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

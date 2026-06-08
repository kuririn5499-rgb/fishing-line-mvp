/**
 * POST /api/announcement
 * お知らせを LINE Broadcast で全フォロワーへ配信する
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { buildAnnouncementMessage, sendBroadcastMessage } from "@/lib/line-messaging";
import { z } from "zod";

const Schema = z.object({
  content: z.string().min(1).max(500),
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

    const { content, image_urls } = parsed.data;
    const supabase = createServerSupabaseClient();

    await supabase.from("message_logs").insert({
      account_id: session.accountId,
      user_id: session.userId,
      message_type: "announcement",
      title: "お知らせ",
      body: content,
      sent_at: new Date().toISOString(),
    });

    const { data: account } = await supabase
      .from("accounts")
      .select("line_channel_access_token")
      .eq("id", session.accountId)
      .maybeSingle();

    const token =
      account?.line_channel_access_token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (token) {
      const messages = buildAnnouncementMessage({ content, imageUrls: image_urls });
      await sendBroadcastMessage(token, messages);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

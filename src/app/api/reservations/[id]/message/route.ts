/**
 * POST /api/reservations/:id/message
 * 予約者へ LINE Push メッセージを送信する（船長→お客さん 1対1）
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { sendPushMessage } from "@/lib/line-messaging";
import { z } from "zod";

const Schema = z.object({
  message: z.string().min(1, "メッセージを入力してください").max(1000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const { id: reservationId } = await params;
    const body = await req.json();

    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 予約 → customer_id 取得
    const { data: reservation } = await supabase
      .from("reservations")
      .select("customer_id, account_id")
      .eq("id", reservationId)
      .eq("account_id", session.accountId)
      .maybeSingle();

    if (!reservation?.customer_id) {
      return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
    }

    // customer → user_id 取得
    const { data: customer } = await supabase
      .from("customers")
      .select("user_id")
      .eq("id", reservation.customer_id)
      .maybeSingle();

    if (!customer?.user_id) {
      return NextResponse.json(
        { error: "このお客様はLINE未連携のため送信できません（電話受付の手動予約など）" },
        { status: 400 }
      );
    }

    // user → line_user_id 取得
    const { data: user } = await supabase
      .from("users")
      .select("line_user_id")
      .eq("id", customer.user_id)
      .maybeSingle();

    if (!user?.line_user_id) {
      return NextResponse.json({ error: "LINE IDが登録されていません" }, { status: 400 });
    }

    // LINE user ID のフォーマット確認（U + 32桁16進数）
    console.log("[message] line_user_id:", user.line_user_id, "length:", user.line_user_id.length);
    if (!/^U[0-9a-f]{32}$/i.test(user.line_user_id)) {
      return NextResponse.json(
        { error: `LINE IDの形式が無効です（管理者にお問い合わせください）` },
        { status: 400 }
      );
    }

    // アカウント情報（トークン・船名）取得
    const { data: account } = await supabase
      .from("accounts")
      .select("name, line_channel_access_token")
      .eq("id", session.accountId)
      .maybeSingle();

    const token = account?.line_channel_access_token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "LINE トークンが設定されていません" }, { status: 500 });
    }

    const boatName = account?.name ?? "船長";
    const text = `【${boatName}】\n\n${parsed.data.message}`;

    await sendPushMessage(token, user.line_user_id, [{ type: "text", text }]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

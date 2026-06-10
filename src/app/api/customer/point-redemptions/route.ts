/**
 * POST /api/customer/point-redemptions
 * ポイント特典を申請する
 * - ポイントを即時消費 → point_logs に記録 → redemption を pending で作成
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { sendPushMessage } from "@/lib/line-messaging";
import { z } from "zod";

const RedeemSchema = z.object({
  reward_id: z.string().uuid("reward_id は UUID で指定してください"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession("customer");
    const body = await req.json();
    const parsed = RedeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 特典を取得（同じ account かつ is_active）
    const { data: reward } = await supabase
      .from("point_rewards")
      .select("id, title, points_required, account_id")
      .eq("id", parsed.data.reward_id)
      .eq("account_id", session.accountId)
      .eq("is_active", true)
      .maybeSingle();

    if (!reward) {
      return NextResponse.json({ error: "特典が見つかりません" }, { status: 404 });
    }

    // 顧客レコードを取得
    const { data: customer } = await supabase
      .from("customers")
      .select("id, points")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: "顧客情報が見つかりません" }, { status: 404 });
    }

    if (customer.points < reward.points_required) {
      return NextResponse.json(
        { error: `ポイントが不足しています（必要: ${reward.points_required} pt、残高: ${customer.points} pt）` },
        { status: 400 }
      );
    }

    // ポイント消費
    await supabase
      .from("customers")
      .update({ points: customer.points - reward.points_required })
      .eq("id", customer.id);

    // point_log に記録
    await supabase.from("point_logs").insert({
      account_id: session.accountId,
      customer_id: customer.id,
      points_delta: -reward.points_required,
      reason: `特典申請: ${reward.title}`,
    });

    // 申請レコードを作成
    const { data: redemption, error: redemptionErr } = await supabase
      .from("point_redemptions")
      .insert({
        account_id: session.accountId,
        user_id: session.userId,
        customer_id: customer.id,
        reward_id: reward.id,
        points_used: reward.points_required,
        status: "pending",
      })
      .select()
      .single();

    if (redemptionErr || !redemption) throw new Error(redemptionErr?.message);

    // 船長・スタッフへ LINE 通知（失敗しても申請自体は成功扱い）
    try {
      const { data: account } = await supabase
        .from("accounts")
        .select("name, line_channel_access_token")
        .eq("id", session.accountId)
        .maybeSingle();

      const token = account?.line_channel_access_token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN;

      const { data: nfPt } = await supabase.from("accounts").select("notify_line_point_redemption").eq("id", session.accountId).maybeSingle();
      if (token && (nfPt as { notify_line_point_redemption?: boolean } | null)?.notify_line_point_redemption !== false) {
        const { data: captains } = await supabase
          .from("users")
          .select("line_user_id")
          .eq("account_id", session.accountId)
          .in("role", ["captain", "staff", "admin", "operator"])
          .eq("is_active", true)
          .not("line_user_id", "is", null);

        const boatName = account?.name ?? "船ナビ";
        const notifyText = `【${boatName}】\n\n⭐ ポイント特典の申請が届きました\n\n特典: ${reward.title}（${reward.points_required} pt）\n\nポイント管理ページから承認・却下をお願いします。`;

        await Promise.allSettled(
          (captains ?? [])
            .filter((u) => /^U[0-9a-f]{32}$/i.test(u.line_user_id ?? ""))
            .map((u) =>
              sendPushMessage(token, u.line_user_id!, [{ type: "text", text: notifyText }])
            )
        );
      }
    } catch {
      // 通知失敗は無視
    }

    return NextResponse.json({ redemption }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

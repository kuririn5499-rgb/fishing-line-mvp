/**
 * POST /api/customer/point-redemptions
 * ポイント特典を申請する
 * - ポイントを即時消費 → point_logs に記録 → redemption を pending で作成
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
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

    return NextResponse.json({ redemption }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

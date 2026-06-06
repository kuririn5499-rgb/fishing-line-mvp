/**
 * PATCH /api/captain/point-redemptions/[id]
 * 申請を承認（approved）または却下（rejected）する
 * 却下時はポイントを返還する
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const { id } = await params;
    const { status } = await req.json();

    if (status !== "approved" && status !== "rejected") {
      return NextResponse.json({ error: "status は approved / rejected で指定してください" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 申請情報を取得（自アカウントのものか確認）
    const { data: redemption } = await supabase
      .from("point_redemptions")
      .select("id, status, customer_id, points_used")
      .eq("id", id)
      .eq("account_id", session.accountId)
      .eq("status", "pending")
      .maybeSingle();

    if (!redemption) {
      return NextResponse.json({ error: "申請が見つかりません（処理済みの可能性があります）" }, { status: 404 });
    }

    // ステータス更新
    const { error: updateErr } = await supabase
      .from("point_redemptions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) throw updateErr;

    // 却下時: ポイントを返還
    if (status === "rejected" && redemption.customer_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("points")
        .eq("id", redemption.customer_id)
        .maybeSingle();

      if (customer) {
        await supabase
          .from("customers")
          .update({ points: customer.points + redemption.points_used })
          .eq("id", redemption.customer_id);

        await supabase.from("point_logs").insert({
          account_id: session.accountId,
          customer_id: redemption.customer_id,
          points_delta: redemption.points_used,
          reason: "特典申請却下によるポイント返還",
        });
      }
    }

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

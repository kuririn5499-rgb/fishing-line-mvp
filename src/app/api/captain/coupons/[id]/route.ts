/**
 * PATCH /api/captain/coupons/[id]
 * クーポンの有効/無効を切り替える
 * - 無効化: coupons.is_active = false + 未使用の user_coupons → expired
 * - 有効化: coupons.is_active = true のみ（user_coupons は再発行しない）
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
    const { is_active } = await req.json();

    if (typeof is_active !== "boolean") {
      return NextResponse.json({ error: "is_active は boolean で指定してください" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 自アカウントのクーポンか確認しながら更新
    const { data: coupon, error } = await supabase
      .from("coupons")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("account_id", session.accountId)
      .select()
      .single();

    if (error || !coupon) {
      return NextResponse.json({ error: "クーポンが見つかりません" }, { status: 404 });
    }

    // 無効化のとき: 未使用の user_coupons をすべて期限切れに
    if (!is_active) {
      await supabase
        .from("user_coupons")
        .update({ status: "expired" })
        .eq("coupon_id", id)
        .eq("status", "issued");
    }

    return NextResponse.json({ coupon });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/**
 * PATCH /api/captain/point-rewards/[id]  有効/無効を切り替え
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
    const { data, error } = await supabase
      .from("point_rewards")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("account_id", session.accountId)
      .select()
      .single();
    if (error || !data) return NextResponse.json({ error: "特典が見つかりません" }, { status: 404 });
    return NextResponse.json({ reward: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/**
 * GET /api/captain/point-redemptions  申請一覧（船長用）
 */

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("point_redemptions")
      .select(`
        id, points_used, status, note, created_at,
        point_rewards(title, points_required),
        customers(full_name, phone)
      `)
      .eq("account_id", session.accountId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ redemptions: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

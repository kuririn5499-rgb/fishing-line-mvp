/**
 * GET /api/captain/trip-requests  リクエスト一覧（captain）
 */

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("trip_requests")
      .select(`
        *,
        users(display_name, picture_url, line_user_id)
      `)
      .eq("account_id", session.accountId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return NextResponse.json({ requests: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

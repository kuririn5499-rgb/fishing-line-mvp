/**
 * POST /api/captain/trip-requests/:id/reject
 * リクエストを断る
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from("trip_requests")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("account_id", session.accountId)
      .eq("status", "pending");

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

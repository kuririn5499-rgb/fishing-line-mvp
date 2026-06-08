/**
 * GET  /api/trip-requests  自分のリクエスト一覧（customer）
 * POST /api/trip-requests  リクエスト送信（customer）
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { TripRequestCreateSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireSession("customer");
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("trip_requests")
      .select("*")
      .eq("account_id", session.accountId)
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return NextResponse.json({ requests: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession("customer");
    const body = await req.json();

    const parsed = TripRequestCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("trip_requests")
      .insert({
        account_id: session.accountId,
        user_id: session.userId,
        requested_date: parsed.data.requested_date,
        target_species: parsed.data.target_species ?? null,
        message: parsed.data.message ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? "リクエスト作成失敗");

    return NextResponse.json({ request: data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

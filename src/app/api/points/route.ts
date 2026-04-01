/**
 * GET  /api/points   ポイント残高・履歴
 * POST /api/points   ポイント付与（admin / captain のみ）
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { PointGrantSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireSession("customer");
    const supabase = createServerSupabaseClient();

    const { data: customer } = await supabase
      .from("customers")
      .select("id, points")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ points: 0, logs: [] });
    }

    const { data: logs } = await supabase
      .from("point_logs")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ points: customer.points, logs: logs ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const body = await req.json();

    const parsed = PointGrantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { customer_id, points_delta, reason, reservation_id } = parsed.data;

    // ポイントログを作成
    await supabase.from("point_logs").insert({
      account_id: session.accountId,
      customer_id,
      points_delta,
      reason: reason ?? null,
      reservation_id: reservation_id ?? null,
    });

    // customers.points を加算
    await supabase.rpc("increment_customer_points", {
      p_customer_id: customer_id,
      p_delta: points_delta,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

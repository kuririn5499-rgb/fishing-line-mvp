/**
 * GET  /api/captain/point-rewards  特典一覧
 * POST /api/captain/point-rewards  特典を作成
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { z } from "zod";

const RewardCreateSchema = z.object({
  title: z.string().min(1, "特典名は必須です").max(100),
  description: z.string().max(500).optional(),
  points_required: z.coerce.number().int().min(1, "1ポイント以上で設定してください"),
});

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("point_rewards")
      .select("*")
      .eq("account_id", session.accountId)
      .order("points_required", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ rewards: data ?? [] });
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
    const parsed = RewardCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("point_rewards")
      .insert({ account_id: session.accountId, ...parsed.data, is_active: true })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message);
    return NextResponse.json({ reward: data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/**
 * GET  /api/coupons   自分のクーポン一覧
 * POST /api/coupons   クーポン発行（admin のみ）
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { CouponCreateSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireSession("customer");
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("user_coupons")
      .select("*, coupons(*)")
      .eq("user_id", session.userId)
      .order("issued_at", { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ coupons: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession("admin");
    const body = await req.json();

    const parsed = CouponCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("coupons")
      .insert({ ...parsed.data, account_id: session.accountId })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message);
    return NextResponse.json({ coupon: data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

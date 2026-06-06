/**
 * GET  /api/captain/coupons  クーポン一覧
 * POST /api/captain/coupons  クーポン作成 + セグメント別ユーザーへ自動発行
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { CouponCreateSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase";
import { generateCouponTitle, SEGMENT_MIN_BOARDING } from "@/lib/coupon-utils";
import type { CouponSegment } from "@/types";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const supabase = createServerSupabaseClient();

    const { data: coupons, error } = await supabase
      .from("coupons")
      .select("*, user_coupons(count)")
      .eq("account_id", session.accountId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ coupons: coupons ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const body = await req.json();

    const parsed = CouponCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const segment = (d.segment ?? "all") as CouponSegment;
    const discountValue = d.discount_value ?? 0;

    // specific_dates を JSON 文字列に変換
    let specificDates: string | null = null;
    if (d.date_restriction === "specific" && d.specific_dates) {
      const dates = d.specific_dates
        .split(",")
        .map((s) => s.trim())
        .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
      specificDates = JSON.stringify(dates);
    }

    // タイトル：指定がなければ自動生成
    const title =
      d.title?.trim() ||
      generateCouponTitle(d.date_restriction, discountValue, segment);

    const supabase = createServerSupabaseClient();

    // クーポンを作成
    const { data: coupon, error: couponErr } = await supabase
      .from("coupons")
      .insert({
        account_id: session.accountId,
        title,
        description: d.description ?? null,
        discount_type: "amount",
        discount_value: discountValue,
        date_restriction: d.date_restriction,
        specific_dates: specificDates,
        segment,
        valid_from: d.valid_from ?? null,
        valid_to: d.valid_to ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (couponErr || !coupon) {
      throw new Error(`クーポン作成エラー: ${couponErr?.message}`);
    }

    // セグメントに応じて customers を絞り込み → user_id を取得
    const minBoarding = SEGMENT_MIN_BOARDING[segment];
    let customersQuery = supabase
      .from("customers")
      .select("user_id")
      .eq("account_id", session.accountId)
      .not("user_id", "is", null);

    if (minBoarding > 0) {
      customersQuery = customersQuery.gte("boarding_count", minBoarding);
    }

    const { data: customers } = await customersQuery;
    const userIds = (customers ?? [])
      .map((c) => c.user_id as string)
      .filter(Boolean);

    // 重複は無視（UNIQUE制約により1人1回保証）
    // すでに issued/used/expired の行があるユーザーはスキップされる
    if (userIds.length > 0) {
      await supabase.from("user_coupons").upsert(
        userIds.map((userId) => ({
          coupon_id: coupon.id,
          user_id: userId,
          status: "issued",
          issued_at: new Date().toISOString(),
        })),
        { onConflict: "coupon_id,user_id", ignoreDuplicates: true }
      );
    }

    return NextResponse.json(
      { coupon, issued_count: userIds.length },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

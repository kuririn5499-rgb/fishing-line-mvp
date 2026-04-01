/**
 * GET  /api/reservations   予約一覧
 * POST /api/reservations   予約を作成する
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { ReservationCreateSchema } from "@/lib/schemas";
import {
  getReservationsByTrip,
  getReservationsByCustomer,
  createReservation,
} from "@/lib/repositories/reservations";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const tripId = req.nextUrl.searchParams.get("trip_id");

    if (tripId && session.role !== "customer") {
      // captain / admin は便単位で取得
      const reservations = await getReservationsByTrip(tripId, session.accountId);
      return NextResponse.json({ reservations });
    }

    // customer は自分の予約を取得
    const supabase = createServerSupabaseClient();
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ reservations: [] });
    }

    const reservations = await getReservationsByCustomer(
      customer.id,
      session.accountId
    );
    return NextResponse.json({ reservations });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession("customer");
    const body = await req.json();

    const parsed = ReservationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: "顧客情報が見つかりません" }, { status: 404 });
    }

    const reservation = await createReservation(
      session.accountId,
      customer.id,
      parsed.data
    );
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

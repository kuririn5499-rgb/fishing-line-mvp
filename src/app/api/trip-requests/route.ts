/**
 * GET  /api/trip-requests  自分のリクエスト一覧（customer）
 * POST /api/trip-requests  リクエスト送信（customer）
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { TripRequestCreateSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase";
import { sendPushMessage, buildNewTripRequestMessage } from "@/lib/line-messaging";

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

    // 船長・スタッフに LINE 通知（失敗しても続行）
    try {
      const [{ data: account }, { data: captains }, { data: customer }] = await Promise.all([
        supabase.from("accounts").select("line_channel_access_token").eq("id", session.accountId).maybeSingle(),
        supabase.from("users").select("line_user_id").eq("account_id", session.accountId).in("role", ["captain", "staff", "admin", "operator"]).eq("is_active", true),
        supabase.from("customers").select("full_name").eq("user_id", session.userId).maybeSingle(),
      ]);
      const token = account?.line_channel_access_token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
      if (token) {
        const messages = buildNewTripRequestMessage({
          customerName: customer?.full_name ?? session.displayName ?? null,
          requestedDate: parsed.data.requested_date,
          targetSpecies: parsed.data.target_species ?? null,
          message: parsed.data.message ?? null,
        });
        for (const captain of captains ?? []) {
          if (captain.line_user_id) {
            await sendPushMessage(token, captain.line_user_id, messages);
          }
        }
      }
    } catch (notifyErr) {
      console.error("[trip-requests] 船長通知失敗:", notifyErr);
    }

    return NextResponse.json({ request: data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

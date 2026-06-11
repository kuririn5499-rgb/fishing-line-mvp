/**
 * POST /api/captain/trip-requests/:id/approve
 * リクエストを承認して便を作成し、お客さんに LINE 通知を送る
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { TripRequestApproveSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase";
import { createTripEvent, resolveCredentials } from "@/lib/google-calendar";
import { setTripGcalEventId } from "@/lib/repositories/trips";
import { sendPushMessage, buildRequestApprovedMessage } from "@/lib/line-messaging";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const { id } = await params;
    const body = await req.json();

    const parsed = TripRequestApproveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // リクエスト取得
    const { data: request } = await supabase
      .from("trip_requests")
      .select("*, users(line_user_id, display_name)")
      .eq("id", id)
      .eq("account_id", session.accountId)
      .eq("status", "pending")
      .maybeSingle();

    if (!request) {
      return NextResponse.json({ error: "リクエストが見つかりません" }, { status: 404 });
    }

    const { departure_time, return_time, capacity, price_per_person, boat_id, target_species, fishing_method, location } = parsed.data;

    // 便を作成
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .insert({
        account_id: session.accountId,
        boat_id: boat_id ?? null,
        trip_date: request.requested_date,
        departure_time: departure_time || null,
        return_time: return_time || null,
        target_species: target_species || request.target_species || null,
        fishing_method: fishing_method || null,
        location: location || null,
        capacity: capacity ?? null,
        price_per_person: price_per_person ?? null,
        status: "open",
        created_by: session.userId,
      })
      .select()
      .single();

    if (tripErr || !trip) {
      throw new Error(`便作成エラー: ${tripErr?.message}`);
    }

    // リクエストを承認済みに更新
    await supabase
      .from("trip_requests")
      .update({ status: "approved", trip_id: trip.id, updated_at: new Date().toISOString() })
      .eq("id", id);

    // アカウント情報取得（LINE token + Google Calendar + boat_name）
    const { data: account } = await supabase
      .from("accounts")
      .select("name, boat_name, line_channel_access_token, liff_id_customer, google_calendar_id, google_service_account_email, google_service_account_private_key")
      .eq("id", session.accountId)
      .maybeSingle();

    // Google Calendar に同期（失敗しても続行）
    if (departure_time && return_time) {
      try {
        const creds = resolveCredentials(account);
        if (creds) {
          const gcalEventId = await createTripEvent({
            tripId: trip.id,
            tripDate: trip.trip_date,
            departureTime: departure_time,
            returnTime: return_time,
            targetSpecies: trip.target_species ?? undefined,
            capacity: trip.capacity ?? undefined,
            reservedCount: 0,
          }, creds);
          await setTripGcalEventId(trip.id, gcalEventId);
        }
      } catch (calErr) {
        console.error("[trip-requests/approve] カレンダー同期失敗:", calErr);
      }
    }

    // LINE 承認通知（失敗しても続行）
    const users = request.users as { line_user_id: string | null } | null;
    const lineUserId = users?.line_user_id ?? null;
    const lineToken = account?.line_channel_access_token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
    const liffId = account?.liff_id_customer ?? process.env.NEXT_PUBLIC_LIFF_ID_CUSTOMER ?? "";

    const { data: nfApprove } = await supabase.from("accounts").select("notify_line_request_approved").eq("id", session.accountId).maybeSingle();
    const approveNotify = (nfApprove as { notify_line_request_approved?: boolean } | null)?.notify_line_request_approved !== false;
    if (lineUserId && lineToken && approveNotify) {
      try {
        const boatName = account?.boat_name ?? account?.name ?? "船長";
        const liffUrl = liffId ? `https://liff.line.me/${liffId}` : "";
        const messages = buildRequestApprovedMessage({
          boatName,
          requestedDate: request.requested_date,
          targetSpecies: request.target_species,
          departureTime: departure_time || null,
          returnTime: return_time || null,
          capacity: capacity ?? null,
          liffUrl,
        });
        await sendPushMessage(lineToken, lineUserId, messages);
      } catch (lineErr) {
        console.error("[trip-requests/approve] LINE送信失敗:", lineErr);
      }
    }

    return NextResponse.json({ ok: true, trip });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

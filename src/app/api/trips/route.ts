/**
 * GET  /api/trips          便一覧（captain / admin 用）
 * POST /api/trips          便を作成する
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { TripCreateSchema } from "@/lib/schemas";
import { getTripsByAccount, createTrip, getTripsByDate, setTripGcalEventId } from "@/lib/repositories/trips";
import { createTripEvent, createClosedDayEvent, resolveCredentials } from "@/lib/google-calendar";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const date = req.nextUrl.searchParams.get("date");

    const trips = date
      ? await getTripsByDate(session.accountId, date)
      : await getTripsByAccount(session.accountId);

    return NextResponse.json({ trips });
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

    const parsed = TripCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const trip = await createTrip(session.accountId, session.userId, parsed.data);

    // Google カレンダーに同期（失敗してもトリップ作成は成功扱い）
    try {
      const supabase = createServerSupabaseClient();
      const { data: account } = await supabase
        .from("accounts")
        .select("google_calendar_id, google_service_account_email, google_service_account_private_key")
        .eq("id", session.accountId)
        .maybeSingle();
      const creds = resolveCredentials(account);

      if (creds) {
        if (trip.status === "closed") {
          const gcalEventId = await createClosedDayEvent(trip.id, trip.trip_date, creds);
          await setTripGcalEventId(trip.id, gcalEventId);
          trip.gcal_event_id = gcalEventId;
        } else if (trip.departure_time && trip.return_time) {
          const gcalEventId = await createTripEvent({
            tripId: trip.id,
            tripDate: trip.trip_date,
            departureTime: trip.departure_time.slice(0, 5),
            returnTime: trip.return_time.slice(0, 5),
            targetSpecies: trip.target_species ?? undefined,
            fishingMethod: parsed.data.fishing_method ?? undefined,
            location: parsed.data.location ?? undefined,
            capacity: trip.capacity ?? undefined,
            reservedCount: 0,
            notes: trip.weather_note ?? undefined,
          }, creds);
          await setTripGcalEventId(trip.id, gcalEventId);
          trip.gcal_event_id = gcalEventId;
        }
      }
    } catch (calErr) {
      console.error("[trips/POST] Google Calendar 登録失敗:", calErr);
    }

    return NextResponse.json({ trip }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

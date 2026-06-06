/**
 * PATCH /api/trips/[id]  便の内容を更新する
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { TripCreateSchema } from "@/lib/schemas";
import { updateTrip, getTripById } from "@/lib/repositories/trips";
import { updateTripEventDetails, resolveCredentials } from "@/lib/google-calendar";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const { id } = await params;
    const body = await req.json();

    const parsed = TripCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const trip = await updateTrip(id, session.accountId, parsed.data);

    // Google Calendar 更新
    if (trip.gcal_event_id && trip.departure_time && trip.return_time) {
      try {
        const supabase = createServerSupabaseClient();
        const [{ data: reservations }, { data: account }] = await Promise.all([
          supabase
            .from("reservations")
            .select("passengers_count, status")
            .eq("trip_id", trip.id)
            .neq("status", "cancelled"),
          supabase
            .from("accounts")
            .select("google_calendar_id, google_service_account_email, google_service_account_private_key")
            .eq("id", session.accountId)
            .maybeSingle(),
        ]);

        const creds = resolveCredentials(account);
        if (creds) {
          const reservedCount = (reservations ?? []).reduce(
            (sum, r) => sum + (r.passengers_count ?? 0),
            0
          );
          await updateTripEventDetails(trip.gcal_event_id, {
            tripId: trip.id,
            tripDate: trip.trip_date,
            departureTime: trip.departure_time.slice(0, 5),
            returnTime: trip.return_time.slice(0, 5),
            targetSpecies: trip.target_species ?? undefined,
            capacity: trip.capacity ?? undefined,
            reservedCount,
            notes: trip.weather_note ?? undefined,
          }, creds);
        }
      } catch (calErr) {
        console.error("[trips/PATCH] Google Calendar 更新失敗:", calErr);
        return NextResponse.json({ trip, cal_warning: "カレンダー更新に失敗しました" });
      }
    }

    return NextResponse.json({ trip });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

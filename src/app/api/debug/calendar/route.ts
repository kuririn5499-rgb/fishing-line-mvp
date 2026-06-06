/**
 * GET  /api/debug/calendar?trip_id=list  — 全便のgcal状況確認
 * GET  /api/debug/calendar?trip_id=xxx   — 特定便のデバッグ＋パッチテスト
 * POST /api/debug/calendar               — 重複イベントを削除してDBを修復
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { google } from "googleapis";

function getCalClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const auth = new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/calendar"] });
  return google.calendar({ version: "v3", auth });
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "dev only" }, { status: 403 });

  const tripId = req.nextUrl.searchParams.get("trip_id");
  const supabase = createServerSupabaseClient();

  if (!tripId || tripId === "list") {
    const { data, error } = await supabase
      .from("trips")
      .select("id, trip_date, target_species, gcal_event_id")
      .order("trip_date", { ascending: false })
      .limit(20);
    return NextResponse.json({ trips: data, error: error?.message });
  }

  const { data: trip, error: tripErr } = await supabase
    .from("trips")
    .select("id, trip_date, departure_time, return_time, target_species, capacity, gcal_event_id, account_id")
    .eq("id", tripId)
    .maybeSingle();

  if (!trip) return NextResponse.json({ error: "便が見つかりません", tripErr }, { status: 404 });

  const { count } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", tripId)
    .neq("status", "cancelled");

  const result: Record<string, unknown> = {
    trip_in_db: trip,
    reservation_count: count,
    gcal_event_id: trip.gcal_event_id,
    calendar_id: process.env.GOOGLE_CALENDAR_ID,
  };

  const calId = process.env.GOOGLE_CALENDAR_ID ?? "";
  const calendar = getCalClient();

  if (trip.gcal_event_id) {
    try {
      const ev = await calendar.events.get({ calendarId: calId, eventId: trip.gcal_event_id });
      result.current_event = { id: ev.data.id, summary: ev.data.summary };

      const newSummary = buildSummary(trip, count ?? 0);
      const patch = await calendar.events.patch({
        calendarId: calId,
        eventId: trip.gcal_event_id,
        requestBody: { summary: newSummary },
      });
      result.patch_result = { status: patch.status, new_summary: patch.data.summary };
      result.diagnosis = "パッチ成功";
    } catch (e) {
      result.event_error = e instanceof Error ? e.message : String(e);
      result.diagnosis = "イベント操作失敗";
    }
  } else {
    result.diagnosis = "gcal_event_id が DB に未設定";
  }

  return NextResponse.json(result);
}

/** POST: カレンダーの重複イベントを調べて古いものを削除し、DBのgcal_event_idを最新に更新 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "dev only" }, { status: 403 });

  const { trip_id } = await req.json();
  if (!trip_id) return NextResponse.json({ error: "trip_id required" }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const calId = process.env.GOOGLE_CALENDAR_ID ?? "";
  const calendar = getCalClient();

  const { data: trip } = await supabase
    .from("trips")
    .select("id, trip_date, departure_time, return_time, target_species, capacity, gcal_event_id, account_id")
    .eq("id", trip_id)
    .maybeSingle();

  if (!trip) return NextResponse.json({ error: "便が見つかりません" }, { status: 404 });

  // カレンダーから trip_id で検索して全イベントを取得
  const since = new Date(trip.trip_date + "T00:00:00+09:00").toISOString();
  const until = new Date(trip.trip_date + "T23:59:59+09:00").toISOString();

  const listRes = await calendar.events.list({
    calendarId: calId,
    timeMin: since,
    timeMax: until,
    privateExtendedProperty: [`tripId=${trip_id}`],
  });

  const events = listRes.data.items ?? [];
  const deleted: string[] = [];

  if (events.length > 1) {
    // 最新のもの以外を削除
    const sorted = events.sort((a, b) =>
      (a.created ?? "").localeCompare(b.created ?? "")
    );
    for (const ev of sorted.slice(0, -1)) {
      if (ev.id) {
        await calendar.events.delete({ calendarId: calId, eventId: ev.id }).catch(() => {});
        deleted.push(ev.id);
      }
    }
    // 最新イベントのIDをDBに保存
    const latestId = sorted[sorted.length - 1]?.id;
    if (latestId) {
      await supabase.from("trips").update({ gcal_event_id: latestId }).eq("id", trip_id);
    }
  } else if (events.length === 1 && events[0].id !== trip.gcal_event_id) {
    // DBのIDと違う場合も更新
    await supabase.from("trips").update({ gcal_event_id: events[0].id }).eq("id", trip_id);
  }

  // 人数を更新
  const { count } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", trip_id)
    .neq("status", "cancelled");

  const finalEventId = events.length > 0
    ? events[events.length - 1]?.id
    : trip.gcal_event_id;

  if (finalEventId) {
    await calendar.events.patch({
      calendarId: calId,
      eventId: finalEventId,
      requestBody: { summary: buildSummary(trip, count ?? 0) },
    }).catch(() => {});
  }

  return NextResponse.json({
    events_found: events.length,
    deleted_old_events: deleted,
    remaining_event_id: finalEventId,
    reservation_count: count,
  });
}

function buildSummary(trip: { trip_date: string; departure_time: string | null; return_time: string | null; target_species: string | null; capacity: number | null }, reservedCount: number) {
  const [, m, d] = trip.trip_date.split("-");
  const dateStr = `${parseInt(m)}/${parseInt(d)}`;
  const species = trip.target_species ?? "出船";
  const dep = trip.departure_time?.slice(0, 5) ?? "";
  const ret = trip.return_time?.slice(0, 5) ?? "";
  const available = trip.capacity != null ? trip.capacity - reservedCount : null;
  const countStr = available != null
    ? ` 予約${reservedCount}名 募集中${available}名`
    : ` 予約${reservedCount}名`;
  return `${dateStr} ${species} ${dep}〜${ret}${countStr}`;
}

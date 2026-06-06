/**
 * Google Calendar API ヘルパー
 * 出船予定（Trip）を Google カレンダーに同期する。
 *
 * イベントタイトル例: 6/14 タイラバ 05:00〜14:00 予約1名 募集中5名
 * カレンダーのイベントIDは Supabase の trips.gcal_event_id に保存する。
 */

import { google } from "googleapis";

function getCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("Google サービスアカウント設定が不足しています");

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return google.calendar({ version: "v3", auth });
}

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "";

export interface TripEventInput {
  tripId: string;
  tripDate: string;        // "YYYY-MM-DD"
  departureTime: string;   // "HH:MM"
  returnTime: string;      // "HH:MM"
  targetSpecies?: string;  // タイラバ、マダイ etc.
  capacity?: number;       // 定員
  reservedCount?: number;  // 予約済み人数
  notes?: string;
}

/** "YYYY-MM-DD" → "M/D" */
function formatDateShort(date: string): string {
  const [, m, d] = date.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

/** イベントタイトルを生成する */
function buildSummary(input: TripEventInput & { reservedCount?: number }): string {
  const dateStr = formatDateShort(input.tripDate);
  const species = input.targetSpecies ?? "出船";
  const time = `${input.departureTime}〜${input.returnTime}`;
  const reserved = input.reservedCount ?? 0;
  const available =
    input.capacity != null ? input.capacity - reserved : null;

  const countStr =
    available != null
      ? ` 予約${reserved}名 募集中${available}名`
      : ` 予約${reserved}名`;

  return `${dateStr} ${species} ${time}${countStr}`;
}

/** 出船予定をカレンダーに登録し、イベントIDを返す */
export async function createTripEvent(input: TripEventInput): Promise<string> {
  const calendar = getCalendarClient();

  const startDateTime = `${input.tripDate}T${input.departureTime}:00+09:00`;
  const endDateTime = `${input.tripDate}T${input.returnTime}:00+09:00`;

  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: buildSummary({ ...input, reservedCount: input.reservedCount ?? 0 }),
      description: input.notes ?? undefined,
      start: { dateTime: startDateTime, timeZone: "Asia/Tokyo" },
      end: { dateTime: endDateTime, timeZone: "Asia/Tokyo" },
      extendedProperties: {
        private: { tripId: input.tripId },
      },
    },
  });

  return res.data.id ?? "";
}

/** 予約数が変わったときにイベントタイトルを更新する */
export async function updateTripEventCounts(
  eventId: string,
  input: TripEventInput & { reservedCount: number }
): Promise<void> {
  const calendar = getCalendarClient();
  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    requestBody: {
      summary: buildSummary(input),
    },
  });
}

/** 便の日時・内容変更時にカレンダーイベントを更新する */
export async function updateTripEventDetails(
  eventId: string,
  input: TripEventInput & { reservedCount: number }
): Promise<void> {
  const calendar = getCalendarClient();
  const startDateTime = `${input.tripDate}T${input.departureTime}:00+09:00`;
  const endDateTime = `${input.tripDate}T${input.returnTime}:00+09:00`;

  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    requestBody: {
      summary: buildSummary(input),
      description: input.notes ?? undefined,
      start: { dateTime: startDateTime, timeZone: "Asia/Tokyo" },
      end: { dateTime: endDateTime, timeZone: "Asia/Tokyo" },
    },
  });
}

/** 出船予定カレンダーイベントを削除（キャンセル時）する */
export async function deleteTripEvent(eventId: string): Promise<void> {
  const calendar = getCalendarClient();
  await calendar.events.delete({ calendarId: CALENDAR_ID, eventId });
}

/** 指定月の出船予定イベント一覧を取得する */
export async function listTripEvents(year: number, month: number) {
  const calendar = getCalendarClient();

  const timeMin = new Date(year, month - 1, 1).toISOString();
  const timeMax = new Date(year, month, 1).toISOString();

  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
  });

  return res.data.items ?? [];
}

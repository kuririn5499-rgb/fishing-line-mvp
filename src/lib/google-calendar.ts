/**
 * Google Calendar API ヘルパー
 * 出船予定（Trip）を Google カレンダーに同期する。
 *
 * イベントタイトル例: 6/14 タイラバ 05:00〜14:00 予約1名 募集中5名
 * カレンダーのイベントIDは Supabase の trips.gcal_event_id に保存する。
 */

import { google } from "googleapis";

export interface GoogleCalendarCredentials {
  calendarId: string;
  email: string;
  privateKey: string;
}

/** DB またはenv変数から認証情報を解決する */
export function resolveCredentials(account?: {
  google_calendar_id?: string | null;
  google_service_account_email?: string | null;
  google_service_account_private_key?: string | null;
} | null): GoogleCalendarCredentials | null {
  const calendarId = (account?.google_calendar_id ?? process.env.GOOGLE_CALENDAR_ID ?? "").trim();
  const email = (account?.google_service_account_email ?? process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "").trim();

  // 秘密鍵: DBの値が短すぎる場合はenv変数を優先する（コピペ欠損対策）
  const dbKey = account?.google_service_account_private_key ?? "";
  const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "";
  const rawKey = dbKey.length > 100 && dbKey.length >= envKey.length * 0.95 ? dbKey : (envKey || dbKey);
  const privateKey = rawKey.replace(/\\n/g, "\n").trim();

  if (!calendarId || !email || !privateKey) return null;
  return { calendarId, email, privateKey };
}

function getCalendarClient(creds: GoogleCalendarCredentials) {
  const auth = new google.auth.JWT({
    email: creds.email,
    key: creds.privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return google.calendar({ version: "v3", auth });
}

export interface TripEventInput {
  tripId: string;
  tripDate: string;        // "YYYY-MM-DD"
  departureTime: string;   // "HH:MM"
  returnTime: string;      // "HH:MM"
  targetSpecies?: string;
  capacity?: number;
  reservedCount?: number;
  notes?: string;
}

/** "YYYY-MM-DD" → "M/D" */
function formatDateShort(date: string): string {
  const [, m, d] = date.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

function buildSummary(input: TripEventInput & { reservedCount?: number }): string {
  const dateStr = formatDateShort(input.tripDate);
  const species = input.targetSpecies ?? "出船";
  const time = `${input.departureTime}〜${input.returnTime}`;
  const reserved = input.reservedCount ?? 0;
  const available = input.capacity != null ? input.capacity - reserved : null;
  const countStr = available != null ? ` 予約${reserved}名 募集中${available}名` : ` 予約${reserved}名`;
  return `${dateStr} ${species} ${time}${countStr}`;
}

export async function createTripEvent(input: TripEventInput, creds: GoogleCalendarCredentials): Promise<string> {
  const calendar = getCalendarClient(creds);
  const startDateTime = `${input.tripDate}T${input.departureTime}:00+09:00`;
  const endDateTime = `${input.tripDate}T${input.returnTime}:00+09:00`;

  const res = await calendar.events.insert({
    calendarId: creds.calendarId,
    requestBody: {
      summary: buildSummary({ ...input, reservedCount: input.reservedCount ?? 0 }),
      description: input.notes ?? undefined,
      start: { dateTime: startDateTime, timeZone: "Asia/Tokyo" },
      end: { dateTime: endDateTime, timeZone: "Asia/Tokyo" },
      extendedProperties: { private: { tripId: input.tripId } },
    },
  });
  return res.data.id ?? "";
}

export async function updateTripEventCounts(
  eventId: string,
  input: TripEventInput & { reservedCount: number },
  creds: GoogleCalendarCredentials
): Promise<void> {
  const calendar = getCalendarClient(creds);
  await calendar.events.patch({
    calendarId: creds.calendarId,
    eventId,
    requestBody: { summary: buildSummary(input) },
  });
}

export async function updateTripEventDetails(
  eventId: string,
  input: TripEventInput & { reservedCount: number },
  creds: GoogleCalendarCredentials
): Promise<void> {
  const calendar = getCalendarClient(creds);
  const startDateTime = `${input.tripDate}T${input.departureTime}:00+09:00`;
  const endDateTime = `${input.tripDate}T${input.returnTime}:00+09:00`;

  await calendar.events.patch({
    calendarId: creds.calendarId,
    eventId,
    requestBody: {
      summary: buildSummary(input),
      description: input.notes ?? undefined,
      start: { dateTime: startDateTime, timeZone: "Asia/Tokyo" },
      end: { dateTime: endDateTime, timeZone: "Asia/Tokyo" },
    },
  });
}

export async function deleteTripEvent(eventId: string, creds: GoogleCalendarCredentials): Promise<void> {
  const calendar = getCalendarClient(creds);
  await calendar.events.delete({ calendarId: creds.calendarId, eventId });
}

export async function listTripEvents(year: number, month: number, creds: GoogleCalendarCredentials) {
  const calendar = getCalendarClient(creds);
  const timeMin = new Date(year, month - 1, 1).toISOString();
  const timeMax = new Date(year, month, 1).toISOString();

  const res = await calendar.events.list({
    calendarId: creds.calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
  });
  return res.data.items ?? [];
}

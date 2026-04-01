/**
 * DutyLog リポジトリ
 */

import { createServerSupabaseClient } from "@/lib/supabase";
import type { DutyLog } from "@/types";
import type { DutyLogForm } from "@/lib/schemas";

export async function getDutyLogByTrip(tripId: string): Promise<DutyLog | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("duty_logs")
    .select("*")
    .eq("trip_id", tripId)
    .maybeSingle();

  if (error) throw new Error(`duty_log 取得エラー: ${error.message}`);
  return data;
}

export async function upsertDutyLog(
  accountId: string,
  captainUserId: string,
  input: DutyLogForm
): Promise<DutyLog> {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const payload = {
    account_id: accountId,
    trip_id: input.trip_id,
    boat_id: input.boat_id ?? null,
    captain_user_id: captainUserId,
    departure_at: input.departure_at ?? null,
    return_at: input.return_at ?? null,
    passenger_count: input.passenger_count ?? null,
    fishing_area: input.fishing_area ?? null,
    weather: input.weather ?? null,
    sea_condition: input.sea_condition ?? null,
    safety_guidance: input.safety_guidance ?? null,
    incident_report: input.incident_report ?? null,
    catch_summary: input.catch_summary ?? null,
    notes: input.notes ?? null,
    recorded_at: now,
    updated_at: now,
  };

  const existing = await getDutyLogByTrip(input.trip_id);

  if (existing) {
    const { data, error } = await supabase
      .from("duty_logs")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error || !data) throw new Error(`duty_log 更新エラー: ${error?.message}`);
    return data;
  } else {
    const { data, error } = await supabase
      .from("duty_logs")
      .insert(payload)
      .select()
      .single();
    if (error || !data) throw new Error(`duty_log 作成エラー: ${error?.message}`);
    return data;
  }
}

export async function updateDutyLogSheetRow(
  id: string,
  rowNumber: number
): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase
    .from("duty_logs")
    .update({ sheet_row_number: rowNumber })
    .eq("id", id);
}

/**
 * PreDepartureCheck リポジトリ
 */

import { createServerSupabaseClient } from "@/lib/supabase";
import type { PreDepartureCheck } from "@/types";
import type { PreDepartureCheckForm } from "@/lib/schemas";

export async function getPreDepartureByTrip(
  tripId: string
): Promise<PreDepartureCheck | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pre_departure_checks")
    .select("*")
    .eq("trip_id", tripId)
    .maybeSingle();

  if (error) throw new Error(`pre_departure 取得エラー: ${error.message}`);
  return data;
}

export async function upsertPreDeparture(
  accountId: string,
  captainUserId: string,
  input: PreDepartureCheckForm
): Promise<PreDepartureCheck> {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const payload = {
    account_id: accountId,
    trip_id: input.trip_id,
    boat_id: input.boat_id ?? null,
    captain_user_id: captainUserId,
    hull_checked: input.hull_checked,
    bilge_checked: input.bilge_checked,
    fuel_checked: input.fuel_checked,
    fuel_valve_checked: input.fuel_valve_checked,
    engine_oil_checked: input.engine_oil_checked,
    coolant_checked: input.coolant_checked,
    battery_checked: input.battery_checked,
    life_saving_equipment_checked: input.life_saving_equipment_checked,
    radio_checked: input.radio_checked,
    equipment_compliance_checked: input.equipment_compliance_checked,
    rescue_ladder_checked: input.rescue_ladder_checked,
    landing_steps_checked: input.landing_steps_checked,
    fishing_gear_checked: input.fishing_gear_checked,
    gauges_checked: input.gauges_checked,
    cooling_water_checked: input.cooling_water_checked,
    engine_checked: input.engine_checked,
    alcohol_checked: input.alcohol_checked,
    crew_condition_checked: input.crew_condition_checked,
    issue_notes: input.issue_notes ?? null,
    inspector_name: input.inspector_name ?? null,
    inspection_location: input.inspection_location ?? null,
    alcohol_test_value: input.alcohol_test_value ?? null,
    notes: input.notes ?? null,
    checked_at: now,
    updated_at: now,
  };

  const existing = await getPreDepartureByTrip(input.trip_id);

  if (existing) {
    const { data, error } = await supabase
      .from("pre_departure_checks")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error || !data) throw new Error(`pre_departure 更新エラー: ${error?.message}`);
    return data;
  } else {
    const { data, error } = await supabase
      .from("pre_departure_checks")
      .insert(payload)
      .select()
      .single();
    if (error || !data) throw new Error(`pre_departure 作成エラー: ${error?.message}`);
    return data;
  }
}

export async function updatePreDepartureSheetRow(
  id: string,
  rowNumber: number
): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase
    .from("pre_departure_checks")
    .update({ sheet_row_number: rowNumber })
    .eq("id", id);
}

/**
 * BoardingManifest リポジトリ
 */

import { createServerSupabaseClient } from "@/lib/supabase";
import type { BoardingManifest } from "@/types";
import type { ManifestSubmit } from "@/lib/schemas";

export async function getManifestByReservation(
  reservationId: string
): Promise<BoardingManifest | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("boarding_manifests")
    .select("*")
    .eq("reservation_id", reservationId)
    .maybeSingle();

  if (error) throw new Error(`manifest 取得エラー: ${error.message}`);
  return data;
}

export async function getManifestsByTrip(
  tripId: string,
  accountId: string
): Promise<BoardingManifest[]> {
  const supabase = createServerSupabaseClient();
  // reservations 経由で trip に紐づく名簿を取得
  const { data, error } = await supabase
    .from("boarding_manifests")
    .select("*, reservations!inner(trip_id, account_id)")
    .eq("reservations.trip_id", tripId)
    .eq("reservations.account_id", accountId);

  if (error) throw new Error(`manifests 取得エラー: ${error.message}`);
  return data ?? [];
}

/** 名簿を作成または更新する（upsert） */
export async function upsertManifest(
  accountId: string,
  customerId: string | null,
  submittedByUserId: string,
  input: ManifestSubmit
): Promise<BoardingManifest> {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const payload = {
    account_id: accountId,
    reservation_id: input.reservation_id,
    customer_id: customerId,
    submitted_by_user_id: submittedByUserId,
    full_name: input.full_name,
    phone: input.phone,
    address: input.address,
    emergency_name: input.emergency_name,
    emergency_phone: input.emergency_phone,
    life_jacket_owned: input.life_jacket_owned,
    rental_required: input.rental_required,
    companions_json: input.companions,
    notes: input.notes ?? null,
    submitted_at: now,
    updated_at: now,
  };

  // 既存レコードがあれば更新、なければ作成
  const existing = await getManifestByReservation(input.reservation_id);

  if (existing) {
    const { data, error } = await supabase
      .from("boarding_manifests")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error || !data) throw new Error(`manifest 更新エラー: ${error?.message}`);
    return data;
  } else {
    const { data, error } = await supabase
      .from("boarding_manifests")
      .insert(payload)
      .select()
      .single();
    if (error || !data) throw new Error(`manifest 作成エラー: ${error?.message}`);
    return data;
  }
}

/** Sheets 保存後に sheet_row_number を更新する */
export async function updateManifestSheetRow(
  manifestId: string,
  rowNumber: number
): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase
    .from("boarding_manifests")
    .update({ sheet_row_number: rowNumber })
    .eq("id", manifestId);
}

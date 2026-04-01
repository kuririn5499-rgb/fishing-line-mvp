/**
 * Reservation リポジトリ
 */

import { createServerSupabaseClient } from "@/lib/supabase";
import type { Reservation } from "@/types";
import type { ReservationCreate } from "@/lib/schemas";
import { nanoid } from "./utils";

export async function getReservationsByTrip(
  tripId: string,
  accountId: string
): Promise<Reservation[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("trip_id", tripId)
    .eq("account_id", accountId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`reservations 取得エラー: ${error.message}`);
  return data ?? [];
}

export async function getReservationsByCustomer(
  customerId: string,
  accountId: string
): Promise<Reservation[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("*, trips(trip_date, departure_time, target_species, status)")
    .eq("customer_id", customerId)
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`reservations 取得エラー: ${error.message}`);
  return data ?? [];
}

export async function createReservation(
  accountId: string,
  customerId: string,
  input: ReservationCreate
): Promise<Reservation> {
  const supabase = createServerSupabaseClient();

  // 一意の予約コードを生成（重複時は再試行）
  let code = nanoid(8);
  for (let i = 0; i < 5; i++) {
    const { data: exists } = await supabase
      .from("reservations")
      .select("id")
      .eq("reservation_code", code)
      .maybeSingle();
    if (!exists) break;
    code = nanoid(8);
  }

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      account_id: accountId,
      trip_id: input.trip_id,
      customer_id: customerId,
      reservation_code: code,
      passengers_count: input.passengers_count,
      memo: input.memo ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error || !data) throw new Error(`reservation 作成エラー: ${error?.message}`);
  return data;
}

/**
 * Trip リポジトリ
 * trips テーブルへの CRUD 操作をカプセル化する
 */

import { createServerSupabaseClient } from "@/lib/supabase";
import type { Trip, TripStatus } from "@/types";
import type { TripCreate } from "@/lib/schemas";
import { nanoid } from "./utils";

export async function getTripsByAccount(accountId: string): Promise<Trip[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("account_id", accountId)
    .order("trip_date", { ascending: false })
    .order("departure_time", { ascending: true });

  if (error) throw new Error(`trips 取得エラー: ${error.message}`);
  return data ?? [];
}

export async function getTripsByDate(
  accountId: string,
  date: string
): Promise<Trip[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("account_id", accountId)
    .eq("trip_date", date)
    .order("departure_time", { ascending: true });

  if (error) throw new Error(`trips 取得エラー: ${error.message}`);
  return data ?? [];
}

export async function getTripById(
  tripId: string,
  accountId: string
): Promise<Trip | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) throw new Error(`trip 取得エラー: ${error.message}`);
  return data;
}

export async function createTrip(
  accountId: string,
  createdBy: string,
  input: TripCreate
): Promise<Trip> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("trips")
    .insert({
      account_id: accountId,
      created_by: createdBy,
      ...input,
      departure_time: input.departure_time || null,
      return_time: input.return_time || null,
    })
    .select()
    .single();

  if (error || !data) throw new Error(`trip 作成エラー: ${error?.message}`);
  return data;
}

export async function updateTripStatus(
  tripId: string,
  accountId: string,
  status: TripStatus
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("trips")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", tripId)
    .eq("account_id", accountId);

  if (error) throw new Error(`trip ステータス更新エラー: ${error.message}`);
}

/**
 * キャンセル待ち処理
 * キャンセルが発生したとき呼び出し、最先着のキャンセル待ちを繰り上げる
 */

import { createServerSupabaseClient } from "@/lib/supabase";
import { sendPushMessage, buildWaitlistPromotedMessage } from "@/lib/line-messaging";

export async function processWaitlist(tripId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  // 便情報を取得
  const { data: trip } = await supabase
    .from("trips")
    .select("id, capacity, account_id, trip_date, departure_time, target_species, boats(name)")
    .eq("id", tripId)
    .maybeSingle();

  if (!trip || !trip.capacity) return;

  // 現在の確定・承認待ち予約の合計人数
  const { data: active } = await supabase
    .from("reservations")
    .select("passengers_count")
    .eq("trip_id", tripId)
    .in("status", ["confirmed", "pending"]);

  const reserved = (active ?? []).reduce((sum, r) => sum + (r.passengers_count ?? 0), 0);
  const available = trip.capacity - reserved;
  if (available <= 0) return;

  // 最先着のキャンセル待ち予約を取得
  const { data: waitlist } = await supabase
    .from("reservations")
    .select("id, customer_id, passengers_count")
    .eq("trip_id", tripId)
    .eq("status", "waitlist")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!waitlist || waitlist.passengers_count > available) return;

  // キャンセル待ちを confirmed に昇格
  await supabase
    .from("reservations")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", waitlist.id);

  // LINE 通知
  try {
    const { data: account } = await supabase
      .from("accounts")
      .select("name, boat_name, line_channel_access_token")
      .eq("id", trip.account_id)
      .maybeSingle();

    const token = account?.line_channel_access_token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) return;

    const { data: customer } = await supabase
      .from("customers")
      .select("user_id")
      .eq("id", waitlist.customer_id)
      .maybeSingle();

    if (!customer?.user_id) return;

    const { data: user } = await supabase
      .from("users")
      .select("line_user_id")
      .eq("id", customer.user_id)
      .maybeSingle();

    if (!user?.line_user_id) return;

    const boats = trip.boats as { name: string } | { name: string }[] | null;
    const boatName = (Array.isArray(boats) ? boats[0]?.name : boats?.name)
      ?? account?.boat_name ?? account?.name ?? "船長";

    const messages = buildWaitlistPromotedMessage({
      boatName,
      tripDate: trip.trip_date,
      departureTime: trip.departure_time,
      targetSpecies: trip.target_species,
    });

    await sendPushMessage(token, user.line_user_id, messages);

    await supabase.from("message_logs").insert({
      account_id: trip.account_id,
      message_type: "waitlist_promoted",
      title: `キャンセル待ち繰り上がり ${trip.trip_date}`,
      body: waitlist.id,
      sent_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[waitlist] LINE送信失敗:", e);
  }
}

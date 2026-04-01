/**
 * /customer/manifest — 乗船名簿入力
 * 予約を選んで名簿を提出する。前回情報を初期値として表示する。
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { ManifestForm } from "@/components/forms/ManifestForm";
import { Card } from "@/components/ui/Card";
import type { Reservation, BoardingManifest } from "@/types";

export default async function CustomerManifestPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  // 自分の customer レコード
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (!customer) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-gray-800">乗船名簿</h1>
        <Card>
          <p className="text-sm text-gray-400 text-center py-4">
            まず予約を行ってください
          </p>
        </Card>
      </div>
    );
  }

  // 名簿未提出の予約一覧
  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, reservation_code, trips(trip_date, departure_time, target_species)")
    .eq("customer_id", customer.id)
    .in("status", ["pending", "confirmed"])
    .order("created_at", { ascending: false })
    .limit(10);

  // 前回の名簿データ（初期値として使う）
  const { data: lastManifest } = await supabase
    .from("boarding_manifests")
    .select("*")
    .eq("customer_id", customer.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">乗船名簿</h1>
      <p className="text-xs text-gray-500">
        乗船前に名簿の提出が必要です。前回の情報を自動入力します。
      </p>

      {!reservations || reservations.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-4">
            名簿を提出できる予約がありません
          </p>
        </Card>
      ) : (
        <ManifestForm
          reservations={reservations as unknown as Reservation[]}
          defaultValues={lastManifest as BoardingManifest | null}
        />
      )}
    </div>
  );
}

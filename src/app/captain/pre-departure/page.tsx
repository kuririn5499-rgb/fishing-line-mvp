/**
 * /captain/pre-departure — 出船前検査フォーム
 * クエリパラメータ ?trip_id= で便を指定する
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { PreDepartureForm } from "@/components/forms/PreDepartureForm";
import { Card } from "@/components/ui/Card";
import { todayJST } from "@/lib/repositories/utils";
import type { Trip, Boat, PreDepartureCheck } from "@/types";

interface PageProps {
  searchParams: Promise<{ trip_id?: string }>;
}

export default async function PreDeparturePage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) return null;

  const { trip_id } = await searchParams;
  const supabase = createServerSupabaseClient();

  // 便一覧（本日 + 未来）
  const today = todayJST();
  const { data: trips } = await supabase
    .from("trips")
    .select("*, boats(id, name)")
    .eq("account_id", session.accountId)
    .gte("trip_date", today)
    .in("status", ["open", "confirmed", "full"])
    .order("trip_date", { ascending: true })
    .order("departure_time", { ascending: true })
    .limit(20);

  // 選択中の便
  const selectedTrip = trips?.find((t) => t.id === trip_id) ?? trips?.[0] ?? null;

  // 既存の検査データ
  const { data: existingCheck } = selectedTrip
    ? await supabase
        .from("pre_departure_checks")
        .select("*")
        .eq("trip_id", selectedTrip.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">出船前検査</h1>

      {!trips || trips.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-6">
            検査を入力できる便がありません
          </p>
        </Card>
      ) : (
        <PreDepartureForm
          trips={trips as (Trip & { boats?: Boat | null })[]}
          selectedTripId={selectedTrip?.id ?? ""}
          existingCheck={existingCheck as PreDepartureCheck | null}
        />
      )}
    </div>
  );
}

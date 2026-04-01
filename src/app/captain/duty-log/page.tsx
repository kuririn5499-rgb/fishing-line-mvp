/**
 * /captain/duty-log — 乗務記録入力
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { DutyLogForm } from "@/components/forms/DutyLogForm";
import { Card } from "@/components/ui/Card";
import type { Trip, Boat, DutyLog } from "@/types";

interface PageProps {
  searchParams: Promise<{ trip_id?: string }>;
}

export default async function DutyLogPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) return null;

  const { trip_id } = await searchParams;
  const supabase = createServerSupabaseClient();

  // 直近7日分の便（完了 or confirmed）
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: trips } = await supabase
    .from("trips")
    .select("*, boats(id, name)")
    .eq("account_id", session.accountId)
    .gte("trip_date", sinceStr)
    .in("status", ["confirmed", "completed"])
    .order("trip_date", { ascending: false })
    .order("departure_time", { ascending: true })
    .limit(20);

  const selectedTrip = trips?.find((t) => t.id === trip_id) ?? trips?.[0] ?? null;

  const { data: existingLog } = selectedTrip
    ? await supabase
        .from("duty_logs")
        .select("*")
        .eq("trip_id", selectedTrip.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">乗務記録</h1>

      {!trips || trips.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-6">
            記録を入力できる便がありません
          </p>
        </Card>
      ) : (
        <DutyLogForm
          trips={trips as (Trip & { boats?: Boat | null })[]}
          selectedTripId={selectedTrip?.id ?? ""}
          existingLog={existingLog as DutyLog | null}
        />
      )}
    </div>
  );
}

/**
 * /join/[slug] — ビジター乗船名簿記入ページ（認証不要・QRコードから開く）
 */

import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";
import { todayJST } from "@/lib/repositories/utils";
import { VisitorManifestForm } from "@/components/join/VisitorManifestForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "乗船名簿記入" };

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ trip?: string }>;
}) {
  const { slug } = await params;
  const qp = await searchParams;

  const supabase = createServerSupabaseClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!account) notFound();

  const today = todayJST();
  const until = new Date();
  until.setDate(until.getDate() + 7);

  const { data: trips } = await supabase
    .from("trips")
    .select("id, trip_date, departure_time, target_species, boats(name)")
    .eq("account_id", account.id)
    .gte("trip_date", today)
    .lte("trip_date", until.toISOString().slice(0, 10))
    .not("status", "in", '("cancelled","completed")')
    .order("trip_date", { ascending: true })
    .order("departure_time", { ascending: true });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-[#0d2137] text-white px-4 py-5 text-center">
        <p className="text-xs text-white/60 mb-1">乗船名簿</p>
        <h1 className="text-lg font-bold">{account.name}</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {!trips || trips.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-gray-400 text-sm">現在受付中の便はありません</p>
          </div>
        ) : (
          <VisitorManifestForm
            accountId={account.id}
            trips={trips as Parameters<typeof VisitorManifestForm>[0]["trips"]}
            defaultTripId={qp?.trip}
          />
        )}
      </div>
    </div>
  );
}

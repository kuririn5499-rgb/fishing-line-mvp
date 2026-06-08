/**
 * /captain/trip-requests — 便リクエスト一覧
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { TripRequestApproveForm } from "@/components/forms/TripRequestApproveForm";

const statusLabel: Record<string, { label: string; className: string }> = {
  pending:  { label: "承認待ち", className: "bg-yellow-100 text-yellow-700" },
  approved: { label: "承認済み", className: "bg-green-100 text-green-700" },
  rejected: { label: "お断り",   className: "bg-gray-100 text-gray-500" },
};

export default async function CaptainTripRequestsPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  const [{ data: requests }, { data: boats }] = await Promise.all([
    supabase
      .from("trip_requests")
      .select("*, users(display_name, picture_url)")
      .eq("account_id", session.accountId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("boats")
      .select("id, name")
      .eq("account_id", session.accountId)
      .eq("is_active", true),
  ]);

  const pending = (requests ?? []).filter((r) => r.status === "pending");
  const others  = (requests ?? []).filter((r) => r.status !== "pending");

  type RequestRow = {
    id: string;
    requested_date: string;
    target_species: string | null;
    message: string | null;
    status: string;
    trip_id: string | null;
    users?: { display_name: string | null; picture_url: string | null } | null;
  };

  function RequestCard({ req }: { req: RequestRow }) {
    const user = req.users as { display_name: string | null; picture_url: string | null } | null;
    const st = statusLabel[req.status] ?? statusLabel.pending;

    return (
      <Card>
        <div className="flex items-start gap-3">
          {user?.picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.picture_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0">🙋</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.className}`}>{st.label}</span>
              <span className="text-xs text-gray-400">{user?.display_name ?? "お客様"}</span>
            </div>

            {req.status === "pending" ? (
              <TripRequestApproveForm
                request={{
                  id: req.id,
                  requested_date: req.requested_date,
                  target_species: req.target_species,
                  message: req.message,
                  requesterName: user?.display_name ?? null,
                }}
                boats={boats ?? []}
              />
            ) : (
              <div className="text-sm space-y-0.5">
                <p className="font-semibold">{req.requested_date}</p>
                {req.target_species && <p className="text-gray-500 text-xs">{req.target_species}</p>}
                {req.message && <p className="text-gray-400 text-xs">{req.message}</p>}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-gray-800">便リクエスト</h1>

      {/* 承認待ち */}
      <section>
        <h2 className="text-sm font-bold text-gray-600 mb-2">
          承認待ち
          {pending.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </h2>
        {pending.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-400 text-center py-4">承認待ちのリクエストはありません</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {pending.map((req) => <RequestCard key={req.id} req={req as RequestRow} />)}
          </div>
        )}
      </section>

      {/* 承認済み / 断ったもの */}
      {others.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-600 mb-2">過去のリクエスト</h2>
          <div className="space-y-2">
            {others.map((req) => <RequestCard key={req.id} req={req as RequestRow} />)}
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import type { PointReward, RedemptionStatus } from "@/types";

const STATUS_LABEL: Record<RedemptionStatus, { label: string; cls: string }> = {
  pending:  { label: "確認待ち", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  approved: { label: "承認済み", cls: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "却下済み", cls: "bg-gray-50 text-gray-500 border-gray-200" },
};

interface Redemption {
  id: string;
  points_used: number;
  status: RedemptionStatus;
  created_at: string;
  point_rewards: { title: string; points_required: number } | null;
  customers: { full_name: string | null; phone: string | null } | null;
}

export default function CaptainPointsPage() {
  const { toast, show, hide } = useToast();

  const [rewards, setRewards] = useState<PointReward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [loadingRedemptions, setLoadingRedemptions] = useState(true);

  // フォーム
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pointsRequired, setPointsRequired] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [tab, setTab] = useState<"rewards" | "requests">("requests");

  const fetchRewards = async () => {
    const res = await fetch("/api/captain/point-rewards");
    if (res.ok) setRewards((await res.json()).rewards ?? []);
    setLoadingRewards(false);
  };

  const fetchRedemptions = async () => {
    const res = await fetch("/api/captain/point-redemptions");
    if (res.ok) setRedemptions((await res.json()).redemptions ?? []);
    setLoadingRedemptions(false);
  };

  useEffect(() => {
    fetchRewards();
    fetchRedemptions();
  }, []);

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(pointsRequired, 10);
    if (!title.trim()) { show("特典名を入力してください", "error"); return; }
    if (isNaN(pts) || pts < 1) { show("ポイント数を1以上で入力してください", "error"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/captain/point-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, points_required: pts }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "作成に失敗しました");
      show("特典を追加しました", "success");
      setTitle(""); setDescription(""); setPointsRequired("");
      setShowForm(false);
      fetchRewards();
    } catch (err) {
      show(err instanceof Error ? err.message : "作成に失敗しました", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleReward = async (reward: PointReward) => {
    setTogglingId(reward.id);
    try {
      const res = await fetch(`/api/captain/point-rewards/${reward.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !reward.is_active }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      show(`特典を${!reward.is_active ? "有効" : "無効"}にしました`, "success");
      fetchRewards();
    } catch (err) {
      show(err instanceof Error ? err.message : "更新失敗", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const processRedemption = async (id: string, status: "approved" | "rejected") => {
    const label = status === "approved" ? "承認" : "却下";
    if (!confirm(`この申請を${label}しますか？${status === "rejected" ? "\nポイントは返還されます。" : ""}`)) return;

    setProcessingId(id);
    try {
      const res = await fetch(`/api/captain/point-redemptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      show(`申請を${label}しました`, "success");
      fetchRedemptions();
    } catch (err) {
      show(err instanceof Error ? err.message : "更新失敗", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = redemptions.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">ポイント管理</h1>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {(["requests", "rewards"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
              tab === t ? "bg-white shadow-sm text-gray-800" : "text-gray-500"
            }`}
          >
            {t === "requests"
              ? `申請一覧${pendingCount > 0 ? ` (${pendingCount})` : ""}`
              : "特典設定"}
          </button>
        ))}
      </div>

      {/* === 申請一覧 === */}
      {tab === "requests" && (
        <div className="space-y-2">
          {loadingRedemptions ? (
            <p className="text-sm text-gray-400 text-center py-4">読み込み中...</p>
          ) : redemptions.length === 0 ? (
            <Card>
              <p className="text-sm text-gray-400 text-center py-6">申請はありません</p>
            </Card>
          ) : (
            redemptions.map((r) => {
              const s = STATUS_LABEL[r.status];
              const cust = r.customers as unknown as { full_name: string | null; phone: string | null } | null;
              const rw = r.point_rewards as unknown as { title: string } | null;
              return (
                <Card key={r.id} className={`border ${s.cls}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.cls}`}>
                          {s.label}
                        </span>
                        <span className="text-sm font-bold text-gray-800">
                          {rw?.title ?? "特典"}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-700 mt-1">
                        {cust?.full_name ?? "（氏名未登録）"}
                        {cust?.phone && (
                          <a href={`tel:${cust.phone}`} className="ml-2 text-xs text-brand-600 underline">
                            {cust.phone}
                          </a>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {r.points_used.toLocaleString()} pt ·{" "}
                        {new Date(r.created_at).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        loading={processingId === r.id}
                        onClick={() => processRedemption(r.id, "approved")}
                        className="flex-1"
                      >
                        承認
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={processingId === r.id}
                        onClick={() => processRedemption(r.id, "rejected")}
                        className="flex-1"
                      >
                        却下
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* === 特典設定 === */}
      {tab === "rewards" && (
        <div className="space-y-3">
          <Button size="sm" variant="secondary" onClick={() => setShowForm(!showForm)} className="w-full">
            {showForm ? "閉じる" : "＋ 特典を追加"}
          </Button>

          {showForm && (
            <form onSubmit={handleCreateReward} className="bg-white rounded-2xl border border-brand-200 p-4 space-y-3">
              <p className="text-sm font-bold text-gray-700">新しい特典</p>
              <div>
                <label className="text-xs font-medium text-gray-600">特典名 *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: 無料サビキセット"
                  className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">説明（任意）</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="例: 乗船時にお渡しします"
                  className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">必要ポイント *</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min={1}
                    value={pointsRequired}
                    onChange={(e) => setPointsRequired(e.target.value)}
                    placeholder="100"
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <span className="text-sm text-gray-500">pt</span>
                </div>
              </div>
              <Button type="submit" loading={submitting} className="w-full">追加する</Button>
            </form>
          )}

          {loadingRewards ? (
            <p className="text-sm text-gray-400 text-center py-4">読み込み中...</p>
          ) : rewards.length === 0 ? (
            <Card>
              <p className="text-sm text-gray-400 text-center py-6">特典がありません</p>
            </Card>
          ) : (
            rewards.map((r) => (
              <Card key={r.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {r.is_active ? "有効" : "無効"}
                      </span>
                      <p className="text-sm font-bold text-gray-800">{r.title}</p>
                    </div>
                    {r.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                    )}
                    <p className="text-sm font-bold text-brand-600 mt-1">
                      {r.points_required.toLocaleString()} pt
                    </p>
                  </div>
                  <button
                    onClick={() => toggleReward(r)}
                    disabled={togglingId === r.id}
                    className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                      r.is_active
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {togglingId === r.id ? "…" : r.is_active ? "無効にする" : "有効にする"}
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import { DATE_RESTRICTION_LABELS, SEGMENT_LABELS, parseDates } from "@/lib/coupon-utils";
import type { Coupon, DateRestriction, CouponSegment } from "@/types";

const DATE_OPTIONS: { value: DateRestriction; label: string }[] = [
  { value: "none",     label: "日程設定なし" },
  { value: "weekdays", label: "平日限定（月〜金）" },
  { value: "weekends", label: "土日祝限定" },
  { value: "specific", label: "特定の日を指定" },
];

const SEGMENT_OPTIONS: { value: CouponSegment; label: string; sub: string }[] = [
  { value: "all",       label: "全員",            sub: "LINEで登録済みの全てのお客様" },
  { value: "once",      label: "1回以上乗った人", sub: "乗船実績が1回以上のお客様" },
  { value: "five_plus", label: "5回以上乗った人", sub: "乗船実績が5回以上のお客様" },
  { value: "ten_plus",  label: "10回以上乗った人",sub: "乗船実績が10回以上のお客様" },
];

export default function CaptainCouponsPage() {
  const { toast, show, hide } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // フォーム状態
  const [discountValue, setDiscountValue] = useState("");
  const [dateRestriction, setDateRestriction] = useState<DateRestriction>("none");
  const [specificDates, setSpecificDates] = useState<string[]>([""]);
  const [segment, setSegment] = useState<CouponSegment>("all");
  const [validTo, setValidTo] = useState("");

  const fetchCoupons = async () => {
    const res = await fetch("/api/captain/coupons");
    if (res.ok) {
      const json = await res.json();
      setCoupons(json.coupons ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const resetForm = () => {
    setDiscountValue("");
    setDateRestriction("none");
    setSpecificDates([""]);
    setSegment("all");
    setValidTo("");
  };

  const addDate = () => setSpecificDates((p) => [...p, ""]);
  const removeDate = (i: number) =>
    setSpecificDates((p) => p.filter((_, idx) => idx !== i));
  const updateDate = (i: number, v: string) =>
    setSpecificDates((p) => p.map((d, idx) => (idx === i ? v : d)));

  const toggleActive = async (coupon: Coupon) => {
    const next = !coupon.is_active;
    const label = next ? "有効" : "無効";
    if (!next && !confirm(`「${coupon.title}」を無効にしますか？\n未使用分は全て期限切れになります。`)) return;

    setTogglingId(coupon.id);
    try {
      const res = await fetch(`/api/captain/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "更新に失敗しました");
      show(`クーポンを${label}にしました`, "success");
      fetchCoupons();
    } catch (err) {
      show(err instanceof Error ? err.message : "更新に失敗しました", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const value = parseInt(discountValue, 10);
    if (!discountValue || isNaN(value) || value < 100) {
      show("割引金額は100円以上で入力してください", "error");
      return;
    }
    if (dateRestriction === "specific") {
      const valid = specificDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
      if (valid.length === 0) {
        show("特定の日を1日以上入力してください（YYYY-MM-DD形式）", "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/captain/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discount_value: value,
          discount_type: "amount",
          date_restriction: dateRestriction,
          specific_dates:
            dateRestriction === "specific"
              ? specificDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).join(",")
              : "",
          segment,
          valid_to: validTo || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "作成に失敗しました");

      show(`クーポンを発行しました（${json.issued_count}名に配布）`, "success");
      resetForm();
      setShowForm(false);
      fetchCoupons();
    } catch (err) {
      show(err instanceof Error ? err.message : "作成に失敗しました", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">クーポン管理</h1>
        <Button size="sm" onClick={() => { setShowForm(!showForm); resetForm(); }}>
          {showForm ? "閉じる" : "＋ クーポンを作る"}
        </Button>
      </div>

      {/* 作成フォーム */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl border border-brand-200 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-700">新しいクーポンを作成</h2>

          {/* 割引金額 */}
          <section className="space-y-2">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">💰 割引金額</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-500">¥</span>
              <input
                type="number"
                min={100}
                max={100000}
                step={100}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="1000"
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <span className="text-sm text-gray-500 font-medium">OFF</span>
            </div>
          </section>

          {/* 日程 */}
          <section className="space-y-2">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">📅 利用できる日程</p>
            <div className="space-y-2">
              {DATE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                    dateRestriction === opt.value
                      ? "border-brand-400 bg-brand-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="date_restriction"
                    value={opt.value}
                    checked={dateRestriction === opt.value}
                    onChange={() => setDateRestriction(opt.value)}
                    className="accent-brand-500"
                  />
                  <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                </label>
              ))}
            </div>

            {/* 特定の日のみ: 日付マルチ入力 */}
            {dateRestriction === "specific" && (
              <div className="pl-3 space-y-2 pt-1">
                {specificDates.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="date"
                      value={d}
                      onChange={(e) => updateDate(i, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                    {specificDates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDate(i)}
                        className="text-gray-400 hover:text-red-400 text-lg leading-none px-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDate}
                  className="text-xs text-brand-600 font-medium hover:underline"
                >
                  ＋ 日付を追加
                </button>
              </div>
            )}
          </section>

          {/* セグメント */}
          <section className="space-y-2">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">👥 配布対象</p>
            <div className="space-y-2">
              {SEGMENT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                    segment === opt.value
                      ? "border-brand-400 bg-brand-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="segment"
                    value={opt.value}
                    checked={segment === opt.value}
                    onChange={() => setSegment(opt.value)}
                    className="accent-brand-500 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* 有効期限（任意） */}
          <section className="space-y-1">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">⏰ 有効期限（任意）</p>
            <input
              type="date"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </section>

          <Button type="submit" loading={submitting} className="w-full">
            クーポンを発行する
          </Button>
        </form>
      )}

      {/* 発行済みクーポン一覧 */}
      <h2 className="text-sm font-bold text-gray-600">発行済みクーポン</h2>
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">読み込み中...</p>
      ) : coupons.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-6">クーポンがありません</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => {
            const issued = (c as Coupon & { user_coupons?: { count: number }[] })
              .user_coupons?.[0]?.count ?? 0;
            const specificDateList =
              c.date_restriction === "specific" ? parseDates(c.specific_dates) : [];
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-gray-800">{c.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${c.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {c.is_active ? "有効" : "無効"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {c.discount_value != null && (
                        <span className="text-xs bg-brand-50 text-brand-700 font-bold px-2 py-0.5 rounded-full">
                          ¥{c.discount_value.toLocaleString()} OFF
                        </span>
                      )}
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {DATE_RESTRICTION_LABELS[c.date_restriction] ?? c.date_restriction}
                      </span>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {SEGMENT_LABELS[c.segment] ?? c.segment}
                      </span>
                      {issued > 0 && (
                        <span className="text-xs text-gray-400">{issued}名に配布</span>
                      )}
                    </div>

                    {specificDateList.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {specificDateList.join(" / ")}
                      </p>
                    )}

                    {c.valid_to && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        有効期限: {new Date(c.valid_to).toLocaleDateString("ja-JP")}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => toggleActive(c)}
                    disabled={togglingId === c.id}
                    className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                      c.is_active
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {togglingId === c.id ? "…" : c.is_active ? "無効にする" : "有効にする"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  );
}

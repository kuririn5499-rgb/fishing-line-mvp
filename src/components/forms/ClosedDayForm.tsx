"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function ClosedDayForm() {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast, show, hide } = useToast();
  const router = useRouter();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());

  const toggle = (dateStr: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const dates = Array.from(selected).sort();
      const results = await Promise.all(
        dates.map((date) =>
          fetch("/api/trips", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trip_date: date, status: "closed" }),
          }).then(async (r) => {
            const j = await r.json();
            return { ok: r.ok, error: j.error };
          })
        )
      );
      const failed = results.find((r) => !r.ok);
      if (failed) throw new Error(failed.error ?? "一部の登録に失敗しました");
      show(`${dates.length}日分の休船日を登録しました`, "success");
      setSelected(new Set());
      setOpen(false);
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "登録に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-full">
        ⚓ 休船日を設定
      </Button>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">休船日を設定</h2>
          <button
            type="button"
            onClick={() => { setOpen(false); setSelected(new Set()); }}
            className="text-xs text-gray-400"
          >
            閉じる
          </button>
        </div>

        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-gray-700">
            {year}年 {MONTH_LABELS[month]}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg"
          >
            ›
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 text-center">
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className={`text-xs font-medium py-1 ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = toDateStr(year, month, day);
            const isSelected = selected.has(dateStr);
            const isToday = dateStr === todayStr;
            const dow = (firstDayOfWeek + i) % 7;

            return (
              <button
                key={day}
                type="button"
                onClick={() => toggle(dateStr)}
                className={`
                  mx-auto w-9 h-9 rounded-full text-sm flex items-center justify-center transition-colors
                  ${isSelected
                    ? "bg-slate-600 text-white font-semibold"
                    : isToday
                    ? "ring-2 ring-slate-400 text-slate-700 font-medium hover:bg-slate-50"
                    : dow === 0
                    ? "text-red-400 hover:bg-red-50"
                    : dow === 6
                    ? "text-blue-400 hover:bg-blue-50"
                    : "text-gray-700 hover:bg-gray-100"
                  }
                `}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* 選択状況 + 登録ボタン */}
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <p className="text-xs text-center text-gray-400">
            {selected.size > 0
              ? `${selected.size}日選択中 — タップで選択・解除`
              : "日付をタップして選択してください"}
          </p>
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={selected.size === 0}
            className="w-full"
          >
            {selected.size > 0 ? `${selected.size}日分を休船登録` : "日付を選択してください"}
          </Button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}

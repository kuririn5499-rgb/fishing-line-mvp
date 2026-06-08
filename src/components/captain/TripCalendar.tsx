"use client";

import { useState } from "react";
import Link from "next/link";

interface TripSummary {
  id: string;
  trip_date: string;
  departure_time: string | null;
  target_species: string | null;
  status: string;
  boat_name: string | null;
  reserved: number;
  capacity: number | null;
}

interface Props {
  trips: TripSummary[];
  today: string;
}

const STATUS_COLORS: Record<string, string> = {
  open:      "bg-green-400",
  confirmed: "bg-blue-400",
  full:      "bg-red-400",
  draft:     "bg-gray-300",
  cancelled: "bg-gray-200",
  completed: "bg-gray-400",
  closed:    "bg-slate-300",
};

const STATUS_LABELS: Record<string, string> = {
  open: "受付中", confirmed: "確定", full: "満員",
  draft: "下書き", cancelled: "中止", completed: "完了", closed: "休船",
};

export function TripCalendar({ trips, today }: Props) {
  const todayDate = new Date(today);
  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 表示月の1日と末日
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay(); // 0=日

  // 前後の月へ
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  // この月の便を日付でグループ化
  const tripsByDate = new Map<string, TripSummary[]>();
  for (const t of trips) {
    const [ty, tm] = t.trip_date.split("-").map(Number);
    if (ty !== year || tm - 1 !== month) continue;
    if (!tripsByDate.has(t.trip_date)) tripsByDate.set(t.trip_date, []);
    tripsByDate.get(t.trip_date)!.push(t);
  }

  // カレンダーグリッドを構築
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
  ];
  // 7の倍数になるようにパディング
  while (cells.length % 7 !== 0) cells.push(null);

  const DOW = ["日", "月", "火", "水", "木", "金", "土"];

  const selectedTrips = selectedDate ? (tripsByDate.get(selectedDate) ?? []) : [];

  return (
    <div className="space-y-4">
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 text-lg"
        >
          ‹
        </button>
        <h2 className="text-base font-bold text-gray-800">
          {year}年{month + 1}月
        </h2>
        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 text-lg"
        >
          ›
        </button>
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-2">
        {(["open", "confirmed", "full", "closed", "cancelled"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1 text-xs text-gray-500">
            <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[s]}`} />
            {STATUS_LABELS[s]}
          </span>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DOW.map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs py-2 font-medium ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"}`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 日付セル */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`e-${idx}`} className="h-14 border-r border-b border-gray-50 last:border-r-0" />;
            }
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayTrips = tripsByDate.get(dateStr) ?? [];
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            const dow = (startDow + day - 1) % 7;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`h-14 border-r border-b border-gray-50 last:border-r-0 flex flex-col items-center pt-1.5 gap-0.5 transition-colors
                  ${isSelected ? "bg-brand-50" : "hover:bg-gray-50"}
                  ${isToday ? "ring-inset ring-1 ring-brand-400" : ""}
                `}
              >
                <span
                  className={`text-xs font-medium leading-none
                    ${isToday ? "text-brand-600 font-bold" : ""}
                    ${dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-gray-700"}
                  `}
                >
                  {day}
                </span>
                <div className="flex flex-wrap gap-0.5 justify-center max-w-[36px]">
                  {dayTrips.slice(0, 4).map((t) => (
                    <span
                      key={t.id}
                      className={`w-2 h-2 rounded-full ${STATUS_COLORS[t.status] ?? "bg-gray-300"}`}
                    />
                  ))}
                  {dayTrips.length > 4 && (
                    <span className="text-[9px] text-gray-400 leading-none">+{dayTrips.length - 4}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 選択日の便一覧 */}
      {selectedDate && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-700">
            {parseInt(selectedDate.split("-")[1])}月{parseInt(selectedDate.split("-")[2])}日の便
          </h3>
          {selectedTrips.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">便なし</p>
          ) : (
            selectedTrips.map((t) => (
              <Link
                key={t.id}
                href={`/captain/trips`}
                className="block bg-white rounded-xl border border-gray-100 px-4 py-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[t.status] ?? "bg-gray-300"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {t.departure_time ? t.departure_time.slice(0, 5) + "〜" : "時間未定"}
                      {t.target_species ? `　${t.target_species}` : ""}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t.boat_name ?? "—"}
                      {t.capacity != null && (
                        <span className={`ml-2 ${t.reserved >= (t.capacity ?? 0) ? "text-red-500" : "text-green-600"}`}>
                          予約{t.reserved}/{t.capacity}名
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${t.status === "open" ? "bg-green-50 text-green-700" :
                      t.status === "full" ? "bg-red-50 text-red-600" :
                      t.status === "confirmed" ? "bg-blue-50 text-blue-700" :
                      t.status === "closed" ? "bg-slate-100 text-slate-600" :
                      "bg-gray-100 text-gray-500"}`}
                  >
                    {STATUS_LABELS[t.status] ?? t.status}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

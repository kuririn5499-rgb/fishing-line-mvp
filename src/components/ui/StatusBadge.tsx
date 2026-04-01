/**
 * ステータスバッジコンポーネント
 * 便・予約のステータスを色分け表示する
 */

import type { TripStatus, ReservationStatus } from "@/types";

const tripStatusConfig: Record<
  TripStatus,
  { label: string; className: string }
> = {
  draft:     { label: "下書き",   className: "bg-gray-100 text-gray-600" },
  open:      { label: "受付中",   className: "bg-green-100 text-green-700" },
  full:      { label: "満員",     className: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "確定",     className: "bg-blue-100 text-blue-700" },
  cancelled: { label: "中止",     className: "bg-red-100 text-red-700" },
  completed: { label: "完了",     className: "bg-gray-100 text-gray-500" },
};

const reservationStatusConfig: Record<
  ReservationStatus,
  { label: string; className: string }
> = {
  pending:   { label: "受付中",   className: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "確定",     className: "bg-green-100 text-green-700" },
  waitlist:  { label: "キャンセル待ち", className: "bg-orange-100 text-orange-700" },
  cancelled: { label: "キャンセル", className: "bg-red-100 text-red-700" },
  completed: { label: "乗船済み", className: "bg-gray-100 text-gray-500" },
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const config = tripStatusConfig[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const config = reservationStatusConfig[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}

export function DepartureJudgementBadge({
  judgement,
}: {
  judgement: "go" | "cancel" | "hold" | null;
}) {
  if (!judgement) return null;
  const config = {
    go:     { label: "✅ 出船",   className: "bg-green-100 text-green-700" },
    cancel: { label: "❌ 中止",   className: "bg-red-100 text-red-700" },
    hold:   { label: "⏳ 保留中", className: "bg-yellow-100 text-yellow-700" },
  }[judgement];
  return (
    <span className={`text-sm font-bold px-3 py-1 rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}

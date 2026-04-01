/**
 * 汎用カードコンポーネント
 * モバイルファーストの白基調カード
 */

import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** クリック可能なカードにする場合に指定 */
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  const base =
    "bg-white rounded-2xl shadow-sm border border-gray-100 p-4";
  const clickable = onClick
    ? "cursor-pointer active:scale-95 transition-transform"
    : "";

  return (
    <div className={`${base} ${clickable} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div>
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

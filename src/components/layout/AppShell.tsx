/**
 * アプリ共通レイアウト
 * ヘッダー + コンテンツ領域 + ボトムナビ（モバイル）
 */

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/types";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  role: Role;
  displayName?: string | null;
  pictureUrl?: string | null;
}

// =====================
// ナビゲーション定義
// =====================

const customerNav = [
  { href: "/customer", label: "ホーム", icon: "🏠" },
  { href: "/customer/reservations", label: "予約", icon: "📅" },
  { href: "/customer/manifest", label: "名簿", icon: "📋" },
  { href: "/customer/coupons", label: "クーポン", icon: "🎟️" },
  { href: "/customer/points", label: "ポイント", icon: "⭐" },
];

const captainNav = [
  { href: "/captain", label: "ダッシュボード", icon: "⚓" },
  { href: "/captain/trips", label: "便管理", icon: "🚢" },
  { href: "/captain/manifests", label: "名簿", icon: "📋" },
  { href: "/captain/pre-departure", label: "検査", icon: "✅" },
  { href: "/captain/duty-log", label: "乗務記録", icon: "📝" },
];

const adminNav = [
  { href: "/admin", label: "管理", icon: "⚙️" },
  { href: "/admin/users", label: "ユーザー", icon: "👥" },
];

function getNav(role: Role) {
  if (role === "customer") return customerNav;
  if (role === "captain" || role === "staff") return captainNav;
  if (role === "admin" || role === "operator") return adminNav;
  return [];
}

export function AppShell({
  children,
  title,
  role,
  displayName,
  pictureUrl,
}: AppShellProps) {
  const pathname = usePathname();
  const nav = getNav(role);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎣</span>
          <span className="font-bold text-sea-dark text-sm">
            {title ?? "遊漁船管理"}
          </span>
        </div>
        {displayName && (
          <div className="flex items-center gap-2">
            {pictureUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pictureUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <span className="text-xs text-gray-600 max-w-[120px] truncate">
              {displayName}
            </span>
          </div>
        )}
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-24">
        {children}
      </main>

      {/* ボトムナビ（モバイル用） */}
      {nav.length > 0 && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-area-inset-bottom">
          <ul className="flex max-w-lg mx-auto">
            {nav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    className={`
                      flex flex-col items-center gap-0.5 py-2 px-1
                      text-xs transition-colors
                      ${isActive ? "text-brand-600 font-semibold" : "text-gray-500"}
                    `}
                  >
                    <span className="text-lg leading-none">{item.icon}</span>
                    <span className="leading-none">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

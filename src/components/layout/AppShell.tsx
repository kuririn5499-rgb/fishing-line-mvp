/**
 * アプリ共通レイアウト
 * ヘッダー + コンテンツ領域 + ボトムナビ（モバイル）
 */

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/types";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  role: Role;
  navType?: "captain" | "customer" | "admin";
  displayName?: string | null;
  pictureUrl?: string | null;
  showLogout?: boolean;
}

// =====================
// ナビゲーション定義
// =====================

const customerNav = [
  { href: "/customer", label: "ホーム", icon: "🏠" },
  { href: "/customer/reservations", label: "予約", icon: "📅" },
  { href: "/customer/reports", label: "釣果", icon: "🐟" },
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
  navType,
  displayName,
  pictureUrl,
  showLogout = false,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = async () => {
    if (!confirmLogout) {
      setConfirmLogout(true);
      setTimeout(() => setConfirmLogout(false), 3000);
      return;
    }
    setLoggingOut(true);
    await fetch("/api/auth", { method: "DELETE" });
    router.refresh();
    window.location.reload();
  };
  const nav = navType
    ? navType === "captain" ? captainNav
    : navType === "customer" ? customerNav
    : adminNav
    : getNav(role);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎣</span>
          <span className="font-bold text-sea-dark text-sm">
            {title ?? "船ナビ"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {displayName && (
            <>
              {pictureUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pictureUrl}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              <span className="text-xs text-gray-600 max-w-[80px] truncate">
                {displayName}
              </span>
            </>
          )}
          {showLogout && (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className={`text-xs px-2.5 py-1 rounded-lg border transition ml-1 ${
                confirmLogout
                  ? "border-red-400 text-red-600 bg-red-50"
                  : "border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300"
              }`}
            >
              {loggingOut ? "…" : confirmLogout ? "タップで確定" : "ログアウト"}
            </button>
          )}
        </div>
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

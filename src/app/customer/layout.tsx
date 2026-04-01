/**
 * customer レイアウト
 * セッション検証 + LIFF 初期化を行う
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

export default async function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  // 未ログイン → エントリへ
  if (!session) redirect("/app");

  // captain 以上が誤って customer URL に来た場合はリダイレクト
  if (session.role === "captain" || session.role === "staff") redirect("/captain");
  if (session.role === "admin" || session.role === "operator") redirect("/admin");

  return (
    <AppShell
      role={session.role}
      displayName={session.displayName}
      pictureUrl={session.pictureUrl}
    >
      {children}
    </AppShell>
  );
}

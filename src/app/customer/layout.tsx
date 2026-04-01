/**
 * customer レイアウト
 * セッションがあればそのまま表示、なければ LIFF 初期化を行う
 */

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LiffGate } from "@/components/LiffGate";
import type { ReactNode } from "react";

export default async function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  // captain 以上が誤って customer URL に来た場合はリダイレクト
  if (session?.role === "captain" || session?.role === "staff") redirect("/captain");
  if (session?.role === "admin" || session?.role === "operator") redirect("/admin");

  // セッションなし → LIFF 初期化をクライアントで行う
  if (!session) {
    return (
      <LiffGate
        liffId={process.env.NEXT_PUBLIC_LIFF_ID_CUSTOMER!}
        accountSlug={process.env.ACCOUNT_SLUG ?? "demo"}
        mode="customer"
        redirectTo="/customer"
      />
    );
  }

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

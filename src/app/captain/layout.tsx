/**
 * captain レイアウト
 * セッションがあればそのまま表示、なければ LIFF 初期化を行う
 */

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LiffGate } from "@/components/LiffGate";
import type { ReactNode } from "react";

export default async function CaptainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  // customer が誤って captain URL に来た場合
  if (session?.role === "customer") redirect("/customer");

  // セッションなし → LIFF 初期化をクライアントで行う
  if (!session) {
    return (
      <LiffGate
        liffId={process.env.NEXT_PUBLIC_LIFF_ID_CAPTAIN!}
        accountSlug={process.env.ACCOUNT_SLUG ?? "demo"}
        mode="captain"
        redirectTo="/captain"
      />
    );
  }

  const allowedRoles = ["captain", "staff", "admin", "operator"];
  if (!allowedRoles.includes(session.role)) redirect("/customer");

  return (
    <AppShell
      role={session.role}
      displayName={session.displayName}
      pictureUrl={session.pictureUrl}
      title="船長ダッシュボード"
    >
      {children}
    </AppShell>
  );
}

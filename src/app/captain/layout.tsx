/**
 * captain レイアウト
 * セッションがあればそのまま表示、なければ LIFF 初期化を行う
 */

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LiffGate } from "@/components/LiffGate";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { ReactNode } from "react";

export default async function CaptainLayout({
  children,
  searchParams,
}: {
  children: ReactNode;
  searchParams?: Promise<{ a?: string }>;
}) {
  const session = await getSession();

  // customer が誤って captain URL に来た場合
  if (session?.role === "customer") redirect("/customer");

  // セッションなし → LIFF 初期化をクライアントで行う
  if (!session) {
    const params = await searchParams;
    const slug = params?.a ?? process.env.ACCOUNT_SLUG ?? "demo";

    const supabase = createServerSupabaseClient();
    const { data: account } = await supabase
      .from("accounts")
      .select("liff_id_captain, slug")
      .eq("slug", slug)
      .maybeSingle();

    const liffId = account?.liff_id_captain ?? process.env.NEXT_PUBLIC_LIFF_ID_CAPTAIN ?? "";

    return (
      <LiffGate
        liffId={liffId}
        accountSlug={slug}
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
      navType="captain"
      displayName={session.displayName}
      pictureUrl={session.pictureUrl}
      title="船長ダッシュボード"
    >
      {children}
    </AppShell>
  );
}

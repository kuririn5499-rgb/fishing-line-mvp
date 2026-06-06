/**
 * customer レイアウト
 * セッションがあればそのまま表示、なければ LIFF 初期化を行う
 */

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LiffGate } from "@/components/LiffGate";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { ReactNode } from "react";

export default async function CustomerLayout({
  children,
  searchParams,
}: {
  children: ReactNode;
  searchParams?: Promise<{ a?: string }>;
}) {
  const session = await getSession();

  // captain 以上が誤って customer URL に来た場合はリダイレクト
  if (session?.role === "captain" || session?.role === "staff") redirect("/captain");
  if (session?.role === "admin" || session?.role === "operator") redirect("/admin");

  // セッションなし → LIFF 初期化をクライアントで行う
  if (!session) {
    const params = await searchParams;
    const slug = params?.a ?? process.env.ACCOUNT_SLUG ?? "demo";

    // DB からアカウント情報（LIFF ID）を取得
    const supabase = createServerSupabaseClient();
    const { data: account } = await supabase
      .from("accounts")
      .select("liff_id_customer, slug")
      .eq("slug", slug)
      .maybeSingle();

    const liffId = account?.liff_id_customer ?? process.env.NEXT_PUBLIC_LIFF_ID_CUSTOMER ?? "";

    return (
      <LiffGate
        liffId={liffId}
        accountSlug={slug}
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

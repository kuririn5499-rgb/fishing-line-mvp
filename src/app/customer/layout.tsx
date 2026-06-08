import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LiffGate } from "@/components/LiffGate";
import { CustomerAccountMismatchGuard } from "@/components/customer/AccountMismatchGuard";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { ReactNode } from "react";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  const supabase = createServerSupabaseClient();

  // セッションなし → LIFF 初期化（?a=slug はミドルウェアがセッションを除去済み）
  if (!session) {
    const slug = process.env.ACCOUNT_SLUG ?? "demo";
    const { data: account } = await supabase
      .from("accounts")
      .select("liff_id_customer")
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

  // captain / staff が誤って customer URL に来た場合
  if (session.role === "captain" || session.role === "staff") redirect("/captain");

  const { data: accountInfo } = await supabase
    .from("accounts")
    .select("liff_id_customer, slug")
    .eq("id", session.accountId)
    .maybeSingle();

  const customerLiffId = accountInfo?.liff_id_customer ?? process.env.NEXT_PUBLIC_LIFF_ID_CUSTOMER ?? "";
  const accountSlug = accountInfo?.slug ?? process.env.ACCOUNT_SLUG ?? "";

  return (
    <AppShell
      role={session.role}
      navType="customer"
      displayName={session.displayName}
      pictureUrl={session.pictureUrl}
    >
      <CustomerAccountMismatchGuard
        accountSlug={accountSlug}
        customerLiffId={customerLiffId}
      />
      {children}
    </AppShell>
  );
}

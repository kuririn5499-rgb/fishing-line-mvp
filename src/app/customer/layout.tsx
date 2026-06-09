import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LiffGate } from "@/components/LiffGate";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { ReactNode } from "react";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const supabase = createServerSupabaseClient();

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

  // 船長が /customer に来た場合は /captain?a=slug へ
  if (session.role === "captain" || session.role === "staff") {
    redirect(`/captain?a=${encodeURIComponent(session.accountSlug)}`);
  }

  return (
    <AppShell
      role={session.role}
      navType="customer"
      displayName={session.displayName}
      pictureUrl={session.pictureUrl}
    >
      {children}
    </AppShell>
  );
}

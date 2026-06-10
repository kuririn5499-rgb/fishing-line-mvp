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

  // 未読の釣果・お知らせ件数を取得
  const { data: customerData } = await supabase
    .from("customers")
    .select("last_read_reports_at")
    .eq("user_id", session.userId)
    .eq("account_id", session.accountId)
    .maybeSingle();

  const { count: unreadReports } = await supabase
    .from("message_logs")
    .select("id", { count: "exact", head: true })
    .eq("account_id", session.accountId)
    .in("message_type", ["fishing_report", "announcement"])
    .gt("sent_at", customerData?.last_read_reports_at ?? "1970-01-01T00:00:00Z");

  return (
    <AppShell
      role={session.role}
      navType="customer"
      displayName={session.displayName}
      pictureUrl={session.pictureUrl}
      unreadReports={unreadReports ?? 0}
      showLogout
    >
      {children}
    </AppShell>
  );
}

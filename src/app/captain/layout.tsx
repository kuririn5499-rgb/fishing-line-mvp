import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LiffGate } from "@/components/LiffGate";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "船長ダッシュボード",
  manifest: "/captain-manifest.json",
  icons: {
    icon: "/captain-icon.png",
    apple: "/captain-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Fishing Line 船長",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d2137",
};

export default async function CaptainLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const supabase = createServerSupabaseClient();

  if (!session) {
    const slug = process.env.ACCOUNT_SLUG ?? "demo";
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

  // 一般ユーザーが /captain に来た場合
  if (session.role === "customer") {
    redirect(`/customer?a=${encodeURIComponent(session.accountSlug)}`);
  }

  return (
    <AppShell
      role={session.role}
      navType="captain"
      displayName={session.displayName}
      pictureUrl={session.pictureUrl}
      title="船長ダッシュボード"
      showLogout
    >
      {children}
    </AppShell>
  );
}

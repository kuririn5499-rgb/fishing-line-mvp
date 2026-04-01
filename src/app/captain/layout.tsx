/**
 * captain レイアウト
 * captain / staff / admin のみアクセス可
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

export default async function CaptainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/app");

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

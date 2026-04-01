/**
 * admin / operator レイアウト
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/app");
  if (!["admin", "operator"].includes(session.role)) redirect("/customer");

  return (
    <AppShell
      role={session.role}
      displayName={session.displayName}
      pictureUrl={session.pictureUrl}
      title="管理画面"
    >
      {children}
    </AppShell>
  );
}

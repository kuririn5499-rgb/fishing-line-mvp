import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  const token = store.get("superadmin_token")?.value;
  if (token !== process.env.SUPERADMIN_SECRET) redirect("/superadmin/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-800">🎣 遊漁船システム 管理</h1>
        <span className="text-xs text-gray-400">SuperAdmin</span>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

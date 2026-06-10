import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppEntryPage() {
  const session = await getSession();

  if (session) {
    if (session.role === "customer") {
      redirect("/customer");
    } else {
      redirect("/captain");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center space-y-4">
        <div className="text-5xl">🎣</div>
        <h1 className="text-xl font-bold text-sea-dark">遊漁船管理システム</h1>
        <p className="text-sm text-gray-500">
          LINE アプリからアクセスしてください
        </p>
      </div>
    </div>
  );
}

/**
 * /admin/users — ユーザー管理（role 変更）
 */

import { getSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { UserRoleEditor } from "@/components/forms/UserRoleEditor";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();

  const { data: users } = await supabase
    .from("users")
    .select("id, display_name, line_user_id, role, is_active, created_at")
    .eq("account_id", session.accountId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">ユーザー管理</h1>

      {!users || users.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 text-center py-6">
            ユーザーがいません
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user.id}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.display_name ?? "（名前なし）"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {user.line_user_id}
                  </p>
                  <p className="text-xs text-gray-500">
                    登録: {new Date(user.created_at).toLocaleDateString("ja-JP")}
                    {!user.is_active && (
                      <span className="ml-2 text-red-500">無効</span>
                    )}
                  </p>
                </div>
                <UserRoleEditor
                  userId={user.id}
                  currentRole={user.role as "customer" | "captain" | "staff" | "operator" | "admin"}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

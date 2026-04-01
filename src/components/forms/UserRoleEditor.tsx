/**
 * ユーザー role 変更コンポーネント（admin 用）
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import type { Role } from "@/types";

interface UserRoleEditorProps {
  userId: string;
  currentRole: Role;
}

const roleLabels: Record<Role, string> = {
  customer: "顧客",
  staff: "スタッフ",
  captain: "船長",
  operator: "運営",
  admin: "管理者",
};

const roleColors: Record<Role, string> = {
  customer: "bg-gray-100 text-gray-600",
  staff: "bg-blue-50 text-blue-600",
  captain: "bg-sea-mid text-white",
  operator: "bg-purple-100 text-purple-700",
  admin: "bg-red-100 text-red-700",
};

export function UserRoleEditor({ userId, currentRole }: UserRoleEditorProps) {
  const { toast, show, hide } = useToast();
  const [role, setRole] = useState<Role>(currentRole);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateRole = async (newRole: Role) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "更新失敗");
      setRole(newRole);
      setEditing(false);
      show(`role を「${roleLabels[newRole]}」に変更しました`, "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "更新失敗", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className={`text-xs font-medium px-2 py-1 rounded-full ${roleColors[role]}`}
        >
          {roleLabels[role]}
        </button>
      ) : (
        <div className="flex flex-col gap-1">
          {(Object.keys(roleLabels) as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => updateRole(r)}
              disabled={loading || r === role}
              className={`text-xs px-2 py-1 rounded-full text-left ${
                r === role
                  ? `${roleColors[r]} opacity-50 cursor-not-allowed`
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              {roleLabels[r]}
            </button>
          ))}
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-gray-400 mt-1"
          >
            キャンセル
          </button>
        </div>
      )}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hide} />
      )}
    </>
  );
}

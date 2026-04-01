/**
 * PATCH /api/admin/users/role
 * ユーザーの role を変更する（admin / operator のみ）
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { UserRoleUpdateSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession("operator");
    const body = await req.json();

    const parsed = UserRoleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { user_id, role } = parsed.data;

    const supabase = createServerSupabaseClient();

    // 対象ユーザーが同アカウントに属することを確認
    const { data: targetUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user_id)
      .eq("account_id", session.accountId)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    // operator は admin への昇格はできない（admin のみ可）
    if (role === "admin" && session.role !== "admin") {
      return NextResponse.json(
        { error: "admin への昇格は admin のみ可能です" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("users")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", user_id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

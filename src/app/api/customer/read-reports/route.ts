import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST() {
  try {
    const session = await requireSession();
    const supabase = createServerSupabaseClient();

    await supabase
      .from("customers")
      .update({ last_read_reports_at: new Date().toISOString() })
      .eq("user_id", session.userId)
      .eq("account_id", session.accountId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

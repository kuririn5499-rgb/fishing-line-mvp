import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST() {
  try {
    const session = await requireSession("captain");
    const supabase = createServerSupabaseClient();

    await supabase
      .from("accounts")
      .update({ last_read_reservations_at: new Date().toISOString() })
      .eq("id", session.accountId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase";

async function checkAuth() {
  const store = await cookies();
  return store.get("superadmin_token")?.value === process.env.SUPERADMIN_SECRET;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; boatId: string }> }
) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { boatId } = await params;
  const body = await req.json();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("boats")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", boatId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; boatId: string }> }
) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { boatId } = await params;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("boats").delete().eq("id", boatId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase";

async function checkAuth() {
  const store = await cookies();
  const token = store.get("superadmin_token")?.value;
  return token === process.env.SUPERADMIN_SECRET;
}

export async function GET() {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: data });
}

export async function POST(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { slug, name, boat_name, liff_id_customer, liff_id_captain, line_channel_access_token, line_channel_secret, contact_email, contact_phone, prefecture, feature_points, feature_coupon } = body;

  if (!slug || !name) return NextResponse.json({ error: "slug と name は必須です" }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert({ slug, name, boat_name, liff_id_customer, liff_id_captain, line_channel_access_token, line_channel_secret, contact_email, contact_phone, prefecture, is_active: true, feature_points: feature_points ?? true, feature_coupon: feature_coupon ?? true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ account: data }, { status: 201 });
}

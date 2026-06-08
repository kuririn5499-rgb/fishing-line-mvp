import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

/** GET /api/public/liff-config?slug=testmaru&mode=captain */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const slug = req.nextUrl.searchParams.get("slug");
  const mode = req.nextUrl.searchParams.get("mode") ?? "captain";

  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: account } = await supabase
    .from("accounts")
    .select("liff_id_captain, liff_id_customer")
    .eq("slug", slug)
    .maybeSingle();

  const liffId =
    mode === "captain"
      ? (account?.liff_id_captain ?? process.env.NEXT_PUBLIC_LIFF_ID_CAPTAIN ?? "")
      : (account?.liff_id_customer ?? process.env.NEXT_PUBLIC_LIFF_ID_CUSTOMER ?? "");

  return NextResponse.json({ liffId });
}

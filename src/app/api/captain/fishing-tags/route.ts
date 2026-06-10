import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { z } from "zod";

const CreateTagSchema = z.object({
  tag_type: z.enum(["method", "location"]),
  name: z.string().min(1).max(50),
});

export async function GET() {
  try {
    const session = await requireSession("captain");
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("fishing_tags")
      .select("id, tag_type, name")
      .eq("account_id", session.accountId)
      .order("tag_type")
      .order("name");
    return NextResponse.json({ tags: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    return NextResponse.json({ error: msg }, { status: msg === "UNAUTHORIZED" ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession("captain");
    const body = await req.json();
    const parsed = CreateTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("fishing_tags")
      .insert({ account_id: session.accountId, ...parsed.data })
      .select("id, tag_type, name")
      .single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "同じ名前のタグが既に存在します" }, { status: 409 });
      throw new Error(error.message);
    }
    return NextResponse.json({ tag: data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    return NextResponse.json({ error: msg }, { status: msg === "UNAUTHORIZED" ? 401 : 500 });
  }
}

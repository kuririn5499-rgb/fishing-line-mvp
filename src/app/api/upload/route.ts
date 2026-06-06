/**
 * POST /api/upload
 * 画像ファイルを受け取り Supabase Storage へアップロードする
 * service role key を使うため RLS を回避できる
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await requireSession("captain");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const tripId = formData.get("trip_id") as string | null;

    if (!file) return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `fishing-reports/${tripId ?? "misc"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.storage
      .from("fishing-reports")
      .upload(path, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: urlData } = supabase.storage.from("fishing-reports").getPublicUrl(path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

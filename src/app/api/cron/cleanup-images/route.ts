/**
 * GET /api/cron/cleanup-images
 * fishing-reports バケット内の7日以上前の画像を削除する
 * Vercel Cron から毎日深夜に呼ばれる
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  // 7日前の日時
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  // バケット内のファイル一覧を取得（fishing-reports/以下を再帰的に）
  const folders = await listFolders(supabase);

  let deletedCount = 0;
  const errors: string[] = [];

  for (const folder of folders) {
    const { data: files, error } = await supabase.storage
      .from("fishing-reports")
      .list(folder, { limit: 200 });

    if (error || !files) continue;

    const toDelete = files
      .filter((f) => f.created_at && new Date(f.created_at) < cutoff)
      .map((f) => `${folder}/${f.name}`);

    if (toDelete.length === 0) continue;

    const { error: delErr } = await supabase.storage
      .from("fishing-reports")
      .remove(toDelete);

    if (delErr) {
      errors.push(delErr.message);
    } else {
      deletedCount += toDelete.length;
    }
  }

  return NextResponse.json({
    ok: true,
    deleted: deletedCount,
    cutoff: cutoff.toISOString(),
    errors: errors.length > 0 ? errors : undefined,
  });
}

async function listFolders(supabase: ReturnType<typeof import("@/lib/supabase").createServerSupabaseClient>) {
  const { data, error } = await supabase.storage
    .from("fishing-reports")
    .list("fishing-reports", { limit: 500 });

  if (error || !data) return ["fishing-reports"];

  // サブフォルダ（trip_id ごと）を返す
  const folders = data
    .filter((item) => item.id === null) // フォルダはid=null
    .map((item) => `fishing-reports/${item.name}`);

  return folders.length > 0 ? folders : ["fishing-reports"];
}

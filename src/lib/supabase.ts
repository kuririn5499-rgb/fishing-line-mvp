/**
 * Supabase クライアント
 * - browser: anon key を使う（LIFF 上での読み取り用）
 * - server: service role key を使う（Server Actions / Route Handlers）
 *
 * ※ service role key はフロントに漏れないよう必ずサーバーサイドでのみ使用すること
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** ブラウザ（クライアントコンポーネント）用 */
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

/**
 * サーバーサイド専用（Server Actions / Route Handlers）
 * service role key を使うため、フロントからは絶対にインポートしないこと
 */
export function createServerSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY が設定されていません");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

/**
 * LINE ID トークン検証
 * フロントから送られた idToken を LINE のサーバーで検証し、
 * line_user_id を取得する。
 *
 * 参照: https://developers.line.biz/ja/reference/line-login/#verify-id-token
 */

export interface LineVerifyResult {
  sub: string;        // line_user_id
  name: string;
  picture: string;
  email?: string;
}

/**
 * LINE の /oauth2/v2.1/verify エンドポイントで idToken を検証する
 * @param idToken LIFF から取得した ID トークン
 * @param liffId  LIFF アプリの ID（audience の検証に使用）
 */
export async function verifyLineIdToken(
  idToken: string,
  liffId: string
): Promise<LineVerifyResult> {
  // client_id はチャンネルID（LIFF IDの "-" より前の数字部分）
  const channelId = liffId.split("-")[0];
  const params = new URLSearchParams({
    id_token: idToken,
    client_id: channelId,
  });

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE トークン検証失敗: ${res.status} ${text}`);
  }

  const json = await res.json();

  // LINE API は error フィールドを返すことがある
  if (json.error) {
    throw new Error(`LINE トークン検証エラー: ${json.error_description ?? json.error}`);
  }

  return {
    sub: json.sub,
    name: json.name ?? "",
    picture: json.picture ?? "",
    email: json.email,
  };
}

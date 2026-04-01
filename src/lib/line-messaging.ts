/**
 * LINE Messaging API ヘルパー
 * 出船可否通知・釣果配信などに使用する
 */

const LINE_API_BASE = "https://api.line.me/v2/bot";

/** Push メッセージ送信（1対1） */
export async function sendPushMessage(
  channelAccessToken: string,
  toLineUserId: string,
  messages: LineMessage[]
): Promise<void> {
  const res = await fetch(`${LINE_API_BASE}/message/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ to: toLineUserId, messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE Push 送信失敗: ${res.status} ${text}`);
  }
}

/** Broadcast メッセージ（全フォロワーへ） */
export async function sendBroadcastMessage(
  channelAccessToken: string,
  messages: LineMessage[]
): Promise<void> {
  const res = await fetch(`${LINE_API_BASE}/message/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE Broadcast 送信失敗: ${res.status} ${text}`);
  }
}

/** 出船可否通知メッセージを生成する */
export function buildDepartureNoticeMessage(params: {
  tripDate: string;
  judgement: "go" | "cancel" | "hold";
  boatName: string;
  reason?: string;
}): LineMessage[] {
  const { tripDate, judgement, boatName, reason } = params;

  const judgeText: Record<typeof judgement, string> = {
    go: "✅ 出船します",
    cancel: "❌ 出船中止",
    hold: "⏳ 出船判断を保留中",
  };

  let text = `【${boatName}】${tripDate} の出船情報\n\n${judgeText[judgement]}`;
  if (reason) text += `\n理由: ${reason}`;

  return [{ type: "text", text }];
}

/** 釣果通知メッセージを生成する */
export function buildFishingReportMessage(params: {
  boatName: string;
  tripDate: string;
  catchSummary: string;
  hasVacancy: boolean;
  imageUrl?: string;
}): LineMessage[] {
  const { boatName, tripDate, catchSummary, hasVacancy, imageUrl } = params;
  const messages: LineMessage[] = [];

  if (imageUrl) {
    messages.push({
      type: "image",
      originalContentUrl: imageUrl,
      previewImageUrl: imageUrl,
    });
  }

  const vacancyText = hasVacancy ? "\n\n🎣 空席あり！ぜひご予約ください" : "";
  messages.push({
    type: "text",
    text: `🐟 ${boatName} 釣果情報 (${tripDate})\n\n${catchSummary}${vacancyText}`,
  });

  return messages;
}

// =====================
// 型定義
// =====================

export type LineMessage =
  | { type: "text"; text: string }
  | { type: "image"; originalContentUrl: string; previewImageUrl: string }
  | { type: "flex"; altText: string; contents: unknown };

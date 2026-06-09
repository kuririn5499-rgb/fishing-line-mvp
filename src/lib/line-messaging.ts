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

/** 釣果通知メッセージを生成する（テキスト1件 + 画像最大2枚） */
export function buildFishingReportMessage(params: {
  boatName: string;
  tripDate: string;
  catchSummary: string;
  hasVacancy: boolean;
  imageUrls?: string[];  // 最大2枚
}): LineMessage[] {
  const { boatName, tripDate, catchSummary, hasVacancy, imageUrls } = params;
  const messages: LineMessage[] = [];

  // テキストを先頭に
  const vacancyText = hasVacancy ? "\n\n🎣 空席あり！ぜひご予約ください" : "";
  messages.push({
    type: "text",
    text: `🐟 ${boatName} 釣果情報 (${tripDate})\n\n${catchSummary}${vacancyText}`,
  });

  // 画像は最大2枚まで（LINE の1回送信上限を考慮）
  for (const url of (imageUrls ?? []).slice(0, 2)) {
    messages.push({
      type: "image",
      originalContentUrl: url,
      previewImageUrl: url,
    });
  }

  return messages;
}

/** お知らせメッセージを生成する（テキスト1件 + 画像最大2枚） */
export function buildAnnouncementMessage(params: {
  content: string;
  imageUrls?: string[];
}): LineMessage[] {
  const { content, imageUrls } = params;
  const messages: LineMessage[] = [];
  messages.push({ type: "text", text: `📢 お知らせ\n\n${content}` });
  for (const url of (imageUrls ?? []).slice(0, 2)) {
    messages.push({ type: "image", originalContentUrl: url, previewImageUrl: url });
  }
  return messages;
}

/** 出船リマインダーメッセージを生成する */
export function buildReminderMessage(params: {
  boatName: string;
  tripDate: string;
  departureTime: string | null;
  targetSpecies: string | null;
  liffUrl: string;
}): LineMessage[] {
  const { boatName, tripDate, departureTime, targetSpecies, liffUrl } = params;
  const [, m, d] = tripDate.split("-").map(Number);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dayLabel = days[new Date(tripDate).getDay()];
  const dateStr = `${m}/${d}（${dayLabel}）`;

  let text = `【${boatName}】\n明日（${dateStr}）の出船リマインダーです🚢\n`;
  if (departureTime) text += `\n🕐 出発: ${departureTime.slice(0, 5)}`;
  if (targetSpecies) text += `\n🎣 釣り物: ${targetSpecies}`;
  text += `\n\n出発の30分前にはご集合ください。`;
  if (liffUrl) text += `\n\n乗船名簿の提出はこちら👇\n${liffUrl}`;

  return [{ type: "text", text }];
}

/** 予約キャンセル通知メッセージを生成する（船長向け） */
export function buildCancellationNoticeMessage(params: {
  boatName: string;
  tripDate: string;
  targetSpecies: string | null;
  customerName: string | null;
  passengersCount: number;
}): LineMessage[] {
  const { boatName, tripDate, targetSpecies, customerName, passengersCount } = params;
  const [, m, d] = tripDate.split("-").map(Number);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dayLabel = days[new Date(tripDate).getDay()];
  const dateStr = `${m}/${d}（${dayLabel}）`;
  const text =
    `【${boatName}】キャンセル通知\n\n` +
    `📅 ${dateStr}${targetSpecies ? ` / ${targetSpecies}` : ""}\n` +
    `👤 ${customerName ?? "お客様"}（${passengersCount}名）がキャンセルしました。`;
  return [{ type: "text", text }];
}

/** 便リクエスト承認通知メッセージを生成する */
export function buildRequestApprovedMessage(params: {
  boatName: string;
  requestedDate: string;
  targetSpecies: string | null;
  departureTime: string | null;
  returnTime: string | null;
  capacity: number | null;
  liffUrl: string;
}): LineMessage[] {
  const { boatName, requestedDate, targetSpecies, departureTime, returnTime, capacity, liffUrl } = params;
  const [y, m, d] = requestedDate.split("-").map(Number);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dayLabel = days[new Date(y, m - 1, d).getDay()];
  const dateStr = `${m}/${d}（${dayLabel}）`;
  const timeStr = departureTime && returnTime ? `\n⏰ ${departureTime}〜${returnTime}` : "";
  const capacityStr = capacity ? `\n👥 定員 ${capacity}名` : "";

  const text =
    `【${boatName}】便リクエストが承認されました！\n\n` +
    `📅 ${dateStr}\n` +
    `🎣 ${targetSpecies ?? "釣り"}` +
    timeStr +
    capacityStr +
    `\n\nご予約はこちらからお願いします👇\n${liffUrl}`;

  return [{ type: "text", text }];
}

/** 便リクエスト受信通知（船長向け） */
export function buildNewTripRequestMessage(params: {
  customerName: string | null;
  requestedDate: string;
  targetSpecies: string | null;
  message: string | null;
}): LineMessage[] {
  const { customerName, requestedDate, targetSpecies, message } = params;
  const [y, m, d] = requestedDate.split("-").map(Number);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dayLabel = days[new Date(y, m - 1, d).getDay()];
  const dateStr = `${m}/${d}（${dayLabel}）`;
  let text = `📩 便リクエストが届きました\n\n👤 ${customerName ?? "お客様"}\n📅 ${dateStr}`;
  if (targetSpecies) text += `\n🎣 ${targetSpecies}`;
  if (message) text += `\n💬 ${message}`;
  return [{ type: "text", text }];
}

/** 予約受信通知（船長向け） */
export function buildNewReservationMessage(params: {
  customerName: string | null;
  tripDate: string;
  targetSpecies: string | null;
  passengersCount: number;
  reservationCode: string;
  isWaitlist: boolean;
}): LineMessage[] {
  const { customerName, tripDate, targetSpecies, passengersCount, reservationCode, isWaitlist } = params;
  const [y, m, d] = tripDate.split("-").map(Number);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dayLabel = days[new Date(y, m - 1, d).getDay()];
  const dateStr = `${m}/${d}（${dayLabel}）`;
  const label = isWaitlist ? "キャンセル待ち" : "予約";
  let text = `📩 新しい${label}が入りました\n\n👤 ${customerName ?? "お客様"}（${passengersCount}名）\n📅 ${dateStr}`;
  if (targetSpecies) text += `\n🎣 ${targetSpecies}`;
  text += `\n📋 ${reservationCode}`;
  return [{ type: "text", text }];
}

/** キャンセル待ち繰り上がり通知（顧客向け） */
export function buildWaitlistPromotedMessage(params: {
  boatName: string;
  tripDate: string;
  departureTime: string | null;
  targetSpecies: string | null;
}): LineMessage[] {
  const { boatName, tripDate, departureTime, targetSpecies } = params;
  const timeStr = departureTime ? ` ${departureTime.slice(0, 5)}出船` : "";
  const speciesStr = targetSpecies ? ` / ${targetSpecies}` : "";
  return [
    {
      type: "text",
      text: `【${boatName}】🎉 キャンセル待ちが繰り上がりました！\n\n📅 ${tripDate}${timeStr}${speciesStr}\n\nご予約が確定しましたので、当日はよろしくお願いします！`,
    },
  ];
}

// =====================
// 型定義
// =====================

export type LineMessage =
  | { type: "text"; text: string }
  | { type: "image"; originalContentUrl: string; previewImageUrl: string }
  | { type: "flex"; altText: string; contents: unknown };

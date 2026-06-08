/** ランダムな予約コードを生成する（英数字8文字） */
export function nanoid(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/** 金額を ¥X,XXX 形式で返す */
export function formatPrice(price: number | null | undefined): string {
  if (price == null) return "";
  return `¥${price.toLocaleString("ja-JP")}`;
}

/** YYYY-MM-DD の日付文字列に曜日を付けて返す（例: "2024-06-06（木）"） */
export function formatDateWithDay(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${dateStr}（${days[date.getDay()]}）`;
}

/** 日本時間の今日の日付を YYYY-MM-DD 形式で返す */
export function todayJST(): string {
  return new Date()
    .toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "-");
}

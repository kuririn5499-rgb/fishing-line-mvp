import type { Coupon, CouponSegment } from "@/types";

// 日本の祝日（2025〜2027）
const JAPAN_HOLIDAYS = new Set([
  // 2025
  "2025-01-01","2025-01-13","2025-02-11","2025-02-23","2025-02-24",
  "2025-03-20","2025-04-29","2025-05-03","2025-05-04","2025-05-05",
  "2025-05-06","2025-07-21","2025-08-11","2025-09-15","2025-09-23",
  "2025-10-13","2025-11-03","2025-11-23","2025-11-24",
  // 2026
  "2026-01-01","2026-01-12","2026-02-11","2026-02-23","2026-03-20",
  "2026-04-29","2026-05-03","2026-05-04","2026-05-05","2026-05-06",
  "2026-07-20","2026-08-11","2026-09-21","2026-09-22","2026-09-23",
  "2026-10-12","2026-11-03","2026-11-23",
  // 2027
  "2027-01-01","2027-01-11","2027-02-11","2027-02-23","2027-03-21",
  "2027-03-22","2027-04-29","2027-05-03","2027-05-04","2027-05-05",
  "2027-07-19","2027-08-11","2027-09-20","2027-09-23","2027-10-11",
  "2027-11-03","2027-11-23",
]);

/** クーポンが指定日に有効か判定する */
export function isCouponValidForDate(coupon: Coupon, tripDate: string): boolean {
  const date = new Date(tripDate + "T00:00:00+09:00");
  const day = date.getDay(); // 0=日, 6=土
  const isWeekend = day === 0 || day === 6;
  const isHoliday = JAPAN_HOLIDAYS.has(tripDate);

  switch (coupon.date_restriction) {
    case "weekdays":
      return !isWeekend && !isHoliday;
    case "weekends":
      return isWeekend || isHoliday;
    case "specific": {
      const dates = parseDates(coupon.specific_dates);
      return dates.includes(tripDate);
    }
    default:
      return true;
  }
}

/** 割引後の金額を計算する */
export function calcDiscountAmount(
  pricePerPerson: number,
  passengerCount: number,
  coupon: Coupon
): number {
  const total = pricePerPerson * passengerCount;
  if (coupon.discount_type === "amount") {
    return Math.min(coupon.discount_value ?? 0, total);
  }
  if (coupon.discount_type === "percent") {
    return Math.round(total * (coupon.discount_value ?? 0) / 100);
  }
  return 0;
}

export function parseDates(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as string[];
  } catch {
    return raw.split(",").map((d) => d.trim()).filter(Boolean);
  }
  return [];
}

/** クーポンのタイトルを自動生成する */
export function generateCouponTitle(
  dateRestriction: string,
  discountValue: number,
  segment: CouponSegment
): string {
  const datePart: Record<string, string> = {
    none: "",
    weekdays: "平日限定 ",
    weekends: "土日祝限定 ",
    specific: "特定日限定 ",
  };
  const segmentPart: Record<CouponSegment, string> = {
    all: "",
    once: "（リピーター向け）",
    five_plus: "（常連向け）",
    ten_plus: "（ヘビーユーザー向け）",
  };
  return `${datePart[dateRestriction] ?? ""}¥${discountValue.toLocaleString()} OFF${segmentPart[segment] ?? ""}`;
}

export const DATE_RESTRICTION_LABELS: Record<string, string> = {
  none: "日程設定なし",
  weekdays: "平日限定（月〜金）",
  weekends: "土日祝限定",
  specific: "特定の日のみ",
};

export const SEGMENT_LABELS: Record<CouponSegment, string> = {
  all: "全員",
  once: "1回以上乗った人",
  five_plus: "5回以上乗った人",
  ten_plus: "10回以上乗った人",
};

export const SEGMENT_MIN_BOARDING: Record<CouponSegment, number> = {
  all: 0,
  once: 1,
  five_plus: 5,
  ten_plus: 10,
};

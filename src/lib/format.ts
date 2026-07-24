/** 日付・金額の表示ヘルパー (表示は日本時間で統一。UTCホストにデプロイしてもズレない) */

const TOKYO_DATE = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const TOKYO_TIME = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  // 日付のみの文字列 (YYYY-MM-DD) はタイムゾーン変換せずそのまま整形する
  if (typeof d === "string") {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  }
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return TOKYO_DATE.format(date);
}

export function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return `${fmtDate(date)} ${TOKYO_TIME.format(date)}`;
}

export function fmtYen(n: number | null | undefined): string {
  if (n == null) return "—";
  return `¥${n.toLocaleString("ja-JP")}`;
}

/** YYYY-MM-DD (ローカル日付) */
export function toDateInput(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function ageFromBirthDate(birth: string | null): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
}

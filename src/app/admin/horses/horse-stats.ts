/**
 * 馬ごとの騎乗評価集計 / 予防接種・装蹄の期限判定。
 * 一覧 (140頭) と詳細ページの両方から使うため、N+1 を避ける「まとめ取得」+「純粋関数」の構成にしている。
 */

import { adminDb } from "@/lib/supabase/admin";
import { toDateInput, daysAgo } from "@/lib/format";

/** 次回予定日がこの日数以内に迫っていたら警告扱いにする */
export const DUE_SOON_DAYS = 30;
/** 「直近◯日の騎乗回数」の対象期間 */
export const RECENT_DAYS = 30;

/** 集計に必要な騎乗報告の最小カラム */
export interface RidingStatRow {
  horse_id: string;
  report_date: string;
  fell_off: boolean | null;
  rideability: number | null;
  horse_mood: string | null;
}

export interface HorseRidingStats {
  /** 騎乗報告の総数 */
  total: number;
  /** 落馬の報告数 */
  fellOffCount: number;
  /** 乗りやすさに回答があった件数 */
  rideabilityCount: number;
  /** 乗りやすさの平均 (回答が無ければ null) */
  rideabilityAvg: number | null;
  /** 乗りやすさの分布: index 0 = 評価1 … index 4 = 評価5 */
  distribution: number[];
  /** 直近 RECENT_DAYS 日の騎乗報告数 */
  recentCount: number;
  /** 馬の様子の内訳 (多い順) */
  moodCounts: { mood: string; count: number }[];
}

export function emptyHorseRidingStats(): HorseRidingStats {
  return {
    total: 0,
    fellOffCount: 0,
    rideabilityCount: 0,
    rideabilityAvg: null,
    distribution: [0, 0, 0, 0, 0],
    recentCount: 0,
    moodCounts: [],
  };
}

/** 騎乗報告の配列から1頭分の評価サマリを計算する (純粋関数) */
export function computeHorseRidingStats(rows: RidingStatRow[], recentFrom: string = defaultRecentFrom()): HorseRidingStats {
  const stats = emptyHorseRidingStats();
  const moodMap = new Map<string, number>();
  let rideabilitySum = 0;

  for (const r of rows) {
    stats.total += 1;
    if (r.fell_off) stats.fellOffCount += 1;

    const score = typeof r.rideability === "number" ? r.rideability : null;
    if (score !== null && score >= 1 && score <= 5) {
      stats.rideabilityCount += 1;
      rideabilitySum += score;
      stats.distribution[score - 1] += 1;
    }

    // report_date は YYYY-MM-DD なので文字列比較でそのまま日付比較できる
    if (r.report_date >= recentFrom) stats.recentCount += 1;

    const mood = (r.horse_mood ?? "").trim();
    if (mood) moodMap.set(mood, (moodMap.get(mood) ?? 0) + 1);
  }

  stats.rideabilityAvg = stats.rideabilityCount > 0 ? rideabilitySum / stats.rideabilityCount : null;
  stats.moodCounts = [...moodMap.entries()]
    .map(([mood, count]) => ({ mood, count }))
    .sort((a, b) => b.count - a.count);

  return stats;
}

/** 複数頭分をまとめて集計する (取得済みの行を JS 側で振り分ける) */
export function computeStatsByHorse(
  rows: RidingStatRow[],
  recentFrom: string = defaultRecentFrom()
): Map<string, HorseRidingStats> {
  const grouped = new Map<string, RidingStatRow[]>();
  for (const r of rows) {
    if (!r.horse_id) continue;
    const list = grouped.get(r.horse_id);
    if (list) list.push(r);
    else grouped.set(r.horse_id, [r]);
  }
  const out = new Map<string, HorseRidingStats>();
  for (const [horseId, list] of grouped) out.set(horseId, computeHorseRidingStats(list, recentFrom));
  return out;
}

/** 「直近30日」の起点日 (YYYY-MM-DD) */
export function defaultRecentFrom(): string {
  return toDateInput(daysAgo(RECENT_DAYS));
}

/* ============ 取得 (PostgREST の1000件上限を考慮してページングする) ============ */

const PAGE_SIZE = 1000;
const MAX_PAGES = 40;

/**
 * 騎乗報告の集計用カラムをまとめて取得する。
 * horseIds を渡すとその馬だけに絞る (空配列なら何も取得しない)。
 */
export async function fetchRidingStatRows(horseIds?: string[]): Promise<RidingStatRow[]> {
  if (horseIds && horseIds.length === 0) return [];
  const db = adminDb();
  const out: RidingStatRow[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    let q = db
      .from("riding_reports")
      .select("horse_id, report_date, fell_off, rideability, horse_mood")
      .order("report_date", { ascending: false })
      .order("id", { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (horseIds) q = q.in("horse_id", horseIds);

    const { data, error } = await q;
    if (error || !data) break;
    out.push(...(data as RidingStatRow[]));
    if (data.length < PAGE_SIZE) break;
  }

  return out;
}

/** 馬IDごとの騎乗評価サマリをまとめて作る (一覧ページ用・クエリは1系統のみ) */
export async function fetchRidingStatsByHorse(horseIds?: string[]): Promise<Map<string, HorseRidingStats>> {
  const rows = await fetchRidingStatRows(horseIds);
  return computeStatsByHorse(rows);
}

/* ============ 予防接種・装蹄の期限 ============ */

export type DueLevel = "ok" | "soon" | "overdue";

/** 日付文字列 (YYYY-MM-DD) 同士の日数差。to - from */
export function diffDays(from: string, to: string): number | null {
  const a = parseYmd(from);
  const b = parseYmd(to);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 86400000);
}

function parseYmd(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) {
    const t = new Date(s).getTime();
    return Number.isNaN(t) ? null : t;
  }
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** 次回予定日の状態。予定日が無ければ null */
export function dueLevel(nextDue: string | null | undefined, today: string = toDateInput()): DueLevel | null {
  if (!nextDue) return null;
  const d = diffDays(today, nextDue);
  if (d === null) return null;
  if (d < 0) return "overdue";
  if (d <= DUE_SOON_DAYS) return "soon";
  return "ok";
}

/** 警告対象 (期限超過 or 30日以内) か */
export function isDueAlert(level: DueLevel | null): boolean {
  return level === "overdue" || level === "soon";
}

/** 一覧・詳細で共通の警告行スタイル */
export function dueRowClass(level: DueLevel | null): string {
  if (level === "overdue") return "bg-amber-100";
  if (level === "soon") return "bg-amber-50";
  return "";
}

/** 次回予定日の説明テキスト (例: 「12日超過」「あと8日」) */
export function dueLabel(nextDue: string | null | undefined, today: string = toDateInput()): string {
  if (!nextDue) return "—";
  const d = diffDays(today, nextDue);
  if (d === null) return "—";
  if (d < 0) return `${-d}日超過`;
  if (d === 0) return "本日";
  return `あと${d}日`;
}

/** 馬ごとの「次回予定日」(最も新しく設定された予定日) */
export interface HorseDueInfo {
  vaccinationDue: string | null;
  vaccinationName: string | null;
  farrierDue: string | null;
  farrierKind: string | null;
}

export function emptyHorseDueInfo(): HorseDueInfo {
  return { vaccinationDue: null, vaccinationName: null, farrierDue: null, farrierKind: null };
}

/**
 * 予防接種・装蹄の次回予定日を馬ごとにまとめて取得する。
 * 1頭ずつ問い合わせず、`.in()` の一括取得 → JS 側で最大値を採用する。
 */
export async function fetchDueInfoByHorse(horseIds?: string[]): Promise<Map<string, HorseDueInfo>> {
  const out = new Map<string, HorseDueInfo>();
  if (horseIds && horseIds.length === 0) return out;
  const db = adminDb();

  const fetchAll = async (table: string, extraColumn: string): Promise<Record<string, unknown>[]> => {
    const rows: Record<string, unknown>[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      let query = db
        .from(table)
        .select(`horse_id, next_due_date, ${extraColumn}`)
        .not("next_due_date", "is", null)
        .order("next_due_date", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (horseIds) query = query.in("horse_id", horseIds);
      const { data, error } = await query;
      if (error || !data) break;
      // select の列指定がテンプレート文字列のため supabase-js が行型を推論できない。
      // 実体は { horse_id, next_due_date, <extraColumn> } の配列なので unknown 経由で受ける。
      rows.push(...(data as unknown as Record<string, unknown>[]));
      if (data.length < PAGE_SIZE) break;
    }
    return rows;
  };

  const [vaccinations, farriers] = await Promise.all([
    fetchAll("horse_vaccinations", "vaccine_name"),
    fetchAll("horse_farrier_records", "kind"),
  ]);

  const ensure = (horseId: string): HorseDueInfo => {
    const cur = out.get(horseId);
    if (cur) return cur;
    const fresh = emptyHorseDueInfo();
    out.set(horseId, fresh);
    return fresh;
  };

  for (const row of vaccinations) {
    const horseId = String(row.horse_id ?? "");
    const due = row.next_due_date ? String(row.next_due_date) : null;
    if (!horseId || !due) continue;
    const info = ensure(horseId);
    if (!info.vaccinationDue || due > info.vaccinationDue) {
      info.vaccinationDue = due;
      info.vaccinationName = row.vaccine_name ? String(row.vaccine_name) : null;
    }
  }

  for (const row of farriers) {
    const horseId = String(row.horse_id ?? "");
    const due = row.next_due_date ? String(row.next_due_date) : null;
    if (!horseId || !due) continue;
    const info = ensure(horseId);
    if (!info.farrierDue || due > info.farrierDue) {
      info.farrierDue = due;
      info.farrierKind = row.kind ? String(row.kind) : null;
    }
  }

  return out;
}

/** 乗りやすさ平均の表示 (小数第1位・未回答は「—」) */
export function fmtRideability(avg: number | null): string {
  return avg === null ? "—" : avg.toFixed(1);
}

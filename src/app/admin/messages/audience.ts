import { adminDb } from "@/lib/supabase/admin";
import type { BadgeTone } from "@/components/ui";

/**
 * 一斉配信の宛先解決ロジック (サーバー専用)。
 *
 * 送信フォームの宛先プレビュー (page.tsx) と実際の送信 (actions.ts) が
 * 必ず同じ結果になるよう、両者ともこのモジュールの関数だけを使う。
 * 「誤って想定より広い範囲へ送信する」事故を防ぐため、
 * 対象の絞り込みは常に「明示的に一致したものだけを積む」方式で組み立てている。
 */

/** 重複排除前の宛先候補。key は profile id / lead id など人を一意に表す文字列 */
export interface RawRecipient {
  key: string;
  email: string | null;
  line_id: string | null;
}

/** notifyMany へ渡す実際の宛先 (重複排除済み) */
export interface SendRecipient {
  email: string | null;
  line_id: string | null;
}

export interface AudienceStat {
  /** 宛先人数 (重複排除後) */
  total: number;
  /** メールを送信できる人数 */
  email: number;
  /** LINEを送信できる人数 */
  line: number;
  /** メール・LINEのいずれも未登録で届かない人数 */
  none: number;
}

export interface ResolvedAudience {
  stat: AudienceStat;
  recipients: SendRecipient[];
}

/**
 * 宛先候補を重複排除して、送信対象と件数の内訳を求める。
 * - 同一人物 (key) の重複を除く
 * - 同一メールアドレス / 同一LINE IDへの二重送信を除く
 *   (メールが他の宛先と重複していてもLINEが固有なら、LINEのみ送信する)
 */
export function summarizeAudience(rows: RawRecipient[]): ResolvedAudience {
  const seenKey = new Set<string>();
  const seenEmail = new Set<string>();
  const seenLine = new Set<string>();
  const recipients: SendRecipient[] = [];
  let total = 0;
  let email = 0;
  let line = 0;
  let none = 0;

  for (const row of rows) {
    const key = row.key.trim();
    if (key) {
      if (seenKey.has(key)) continue;
      seenKey.add(key);
    }
    total++;

    const rawEmail = (row.email ?? "").trim();
    const rawLine = (row.line_id ?? "").trim();
    if (!rawEmail && !rawLine) {
      none++;
      continue;
    }

    const emailKey = rawEmail.toLowerCase();
    const useEmail = rawEmail !== "" && !seenEmail.has(emailKey);
    if (useEmail) seenEmail.add(emailKey);
    const useLine = rawLine !== "" && !seenLine.has(rawLine);
    if (useLine) seenLine.add(rawLine);

    // 連絡先がすべて他の宛先と重複している場合は送信しない (二重配信の防止)
    if (!useEmail && !useLine) continue;

    if (useEmail) email++;
    if (useLine) line++;
    recipients.push({ email: useEmail ? rawEmail : null, line_id: useLine ? rawLine : null });
  }

  return { stat: { total, email, line, none }, recipients };
}

/* ============ 一斉メール/LINE (bulk_messages) の宛先 ============ */

export type BulkAudience = "students" | "parents" | "both";

export const BULK_AUDIENCES: BulkAudience[] = ["students", "parents", "both"];

/** 文中で使う短いラベル (クライアント側の message-form.tsx にも同じ表記を持たせている) */
export const BULK_AUDIENCE_SHORT_LABELS: Record<BulkAudience, string> = {
  students: "在校生",
  parents: "保護者",
  both: "在校生+保護者",
};

/** 全クラス (クラスで絞り込まない) を表すフォーム値 */
export const ALL_CLASSES = "";
/** class_name が未設定の在校生を表すフォーム値 */
export const UNASSIGNED_CLASS = "__unassigned__";
export const UNASSIGNED_CLASS_LABEL = "クラス未設定";
export const ALL_CLASSES_LABEL = "全クラス";

interface DirectoryProfile {
  id: string;
  role: string;
  email: string | null;
  line_id: string | null;
}

interface DirectoryStudent {
  id: string;
  class_name: string | null;
  user_id: string | null;
  parent_user_id: string | null;
}

export interface BulkDirectory {
  profiles: DirectoryProfile[];
  students: DirectoryStudent[];
}

/** 宛先解決に必要なデータを一度だけ取得する */
export async function loadBulkDirectory(): Promise<BulkDirectory> {
  const db = adminDb();
  const [profileRes, studentRes] = await Promise.all([
    db.from("profiles").select("id, role, email, line_id").in("role", ["student", "parent"]),
    db.from("students").select("id, class_name, user_id, parent_user_id").eq("status", "enrolled"),
  ]);
  return {
    profiles: (profileRes.data ?? []) as DirectoryProfile[],
    students: (studentRes.data ?? []) as DirectoryStudent[],
  };
}

/** class_name (null/空文字を含む) をフォーム値へ正規化 */
export function classKey(className: string | null): string {
  const value = (className ?? "").trim();
  return value === "" ? UNASSIGNED_CLASS : value;
}

export function classLabel(key: string): string {
  if (key === ALL_CLASSES) return ALL_CLASSES_LABEL;
  return key === UNASSIGNED_CLASS ? UNASSIGNED_CLASS_LABEL : key;
}

/** 在籍中の在校生に存在するクラスの一覧 (未設定は末尾) */
export function listClassKeys(dir: BulkDirectory): string[] {
  const set = new Set<string>();
  for (const s of dir.students) set.add(classKey(s.class_name));
  const named = [...set].filter((k) => k !== UNASSIGNED_CLASS).sort((a, b) => a.localeCompare(b, "ja"));
  return set.has(UNASSIGNED_CLASS) ? [...named, UNASSIGNED_CLASS] : named;
}

/**
 * 対象ロール × クラスから宛先候補を組み立てる。
 * classFilter が ALL_CLASSES のときのみロール全体へ送る (従来の挙動)。
 * 未知のクラス値が渡された場合は一致する在校生がいないため空配列となる (広く送られることはない)。
 */
export function collectBulkRaw(dir: BulkDirectory, audience: BulkAudience, classFilter: string): RawRecipient[] {
  const wantStudent = audience === "students" || audience === "both";
  const wantParent = audience === "parents" || audience === "both";

  if (classFilter === ALL_CLASSES) {
    return dir.profiles
      .filter((p) => (wantStudent && p.role === "student") || (wantParent && p.role === "parent"))
      .map((p) => ({ key: p.id, email: p.email, line_id: p.line_id }));
  }

  const byId = new Map<string, DirectoryProfile>(dir.profiles.map((p) => [p.id, p]));
  const rows: RawRecipient[] = [];
  for (const s of dir.students) {
    if (classKey(s.class_name) !== classFilter) continue;
    if (wantStudent && s.user_id) {
      const p = byId.get(s.user_id);
      if (p && p.role === "student") rows.push({ key: p.id, email: p.email, line_id: p.line_id });
    }
    if (wantParent && s.parent_user_id) {
      const p = byId.get(s.parent_user_id);
      if (p && p.role === "parent") rows.push({ key: p.id, email: p.email, line_id: p.line_id });
    }
  }
  return rows;
}

export interface AudienceStatSet {
  students: AudienceStat;
  parents: AudienceStat;
  both: AudienceStat;
}

export interface ClassOption {
  value: string;
  label: string;
  stats: AudienceStatSet;
}

/** 送信フォームの宛先プレビュー用に、クラス × 対象ロールの件数を事前集計する */
export function buildClassOptions(dir: BulkDirectory): ClassOption[] {
  const make = (value: string): ClassOption => ({
    value,
    label: classLabel(value),
    stats: {
      students: summarizeAudience(collectBulkRaw(dir, "students", value)).stat,
      parents: summarizeAudience(collectBulkRaw(dir, "parents", value)).stat,
      both: summarizeAudience(collectBulkRaw(dir, "both", value)).stat,
    },
  });
  return [make(ALL_CLASSES), ...listClassKeys(dir).map(make)];
}

/**
 * bulk_messages.audience へ保存する文字列。
 * 全クラス宛は従来値 (students / parents / both) を維持し、
 * クラス絞り込み時は履歴で分かるよう「在校生 (1年A組)」形式の表示用文字列を保存する。
 */
export function bulkAudienceValue(audience: BulkAudience, classFilter: string): string {
  if (classFilter === ALL_CLASSES) return audience;
  return `${BULK_AUDIENCE_SHORT_LABELS[audience]} (${classLabel(classFilter)})`;
}

const LEGACY_AUDIENCE_LABELS: Record<string, string> = {
  students: "在校生のみ",
  parents: "保護者のみ",
  both: "在校生+保護者",
};

/** 送信履歴の対象表示 (旧レコードの students/parents/both と新形式の表示用文字列の両方に対応) */
export function bulkAudienceLabel(value: string): string {
  return LEGACY_AUDIENCE_LABELS[value] ?? value;
}

export function bulkAudienceTone(value: string): BadgeTone {
  if (value === "students" || value.startsWith(`${BULK_AUDIENCE_SHORT_LABELS.students} (`)) return "green";
  if (value === "parents" || value.startsWith(`${BULK_AUDIENCE_SHORT_LABELS.parents} (`)) return "amber";
  return "brand";
}

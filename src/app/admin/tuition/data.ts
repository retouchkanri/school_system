import { adminDb } from "@/lib/supabase/admin";
import type { Payment, Student } from "@/lib/types";

/**
 * 学費 (payments.type = 'tuition') の共通クエリ。
 * 一覧ページと CSV 出力ルートの両方から使う。
 *
 * 注意: 学費以外 (入学金・制服代・オープンキャンパス参加費など) の決済に影響しないよう、
 * このファイルの全クエリで必ず .eq("type", "tuition") を付けること。
 */

/** 学費行の表示上の状態 */
export type TuitionState = "paid" | "unpaid" | "overdue" | "void";

export const TUITION_STATE_LABELS: Record<TuitionState, string> = {
  paid: "納付済",
  unpaid: "未納",
  overdue: "期限超過",
  void: "対象外",
};

/** 絞り込みの状態指定 */
export type TuitionStateFilter = "all" | "unpaid" | "overdue" | "paid";

export const STATE_FILTER_OPTIONS: { value: TuitionStateFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "unpaid", label: "未納のみ" },
  { value: "overdue", label: "期限超過のみ" },
  { value: "paid", label: "納付済のみ" },
];

export type TuitionStudent = Pick<Student, "id" | "name" | "student_number" | "class_name" | "status">;

export interface TuitionRow {
  payment: Payment;
  student: TuitionStudent | null;
  state: TuitionState;
}

/** 日本時間の今日 (YYYY-MM-DD) */
export function todayJst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
}

/** 納付日 (YYYY-MM-DD) を日本時間の 0 時として timestamptz 文字列にする */
export function jstDateToTimestamp(date: string): string {
  return `${date}T00:00:00+09:00`;
}

export function tuitionState(payment: Payment, today: string): TuitionState {
  if (payment.status === "confirmed" || payment.status === "paid") return "paid";
  if (payment.status === "refunded" || payment.status === "cancelled") return "void";
  if (payment.due_date && payment.due_date < today) return "overdue";
  return "unpaid";
}

export interface TuitionFilters {
  label: string; // installment_label ("" = すべて)
  state: TuitionStateFilter;
  className: string; // クラス ("" = すべて)
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): TuitionFilters {
  const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));
  const stateRaw = one(sp.state);
  const state: TuitionStateFilter =
    stateRaw === "unpaid" || stateRaw === "overdue" || stateRaw === "paid" ? stateRaw : "all";
  return { label: one(sp.label), state, className: one(sp.class) };
}

export interface TuitionSummary {
  billedTotal: number;
  paidTotal: number;
  unpaidTotal: number;
  overdueCount: number;
}

export interface TuitionData {
  rows: TuitionRow[];
  /** 絞り込み前の全学費行から集計した数値 */
  summary: TuitionSummary;
  /** 名目の選択肢 (登録済みの installment_label 一覧) */
  labels: string[];
  /** クラスの選択肢 */
  classes: string[];
  /** 在籍生徒 (一括請求フォームの選択肢用) */
  students: TuitionStudent[];
  today: string;
}

const STUDENT_COLS = "id, name, student_number, class_name, status";

/** 学費の一覧・集計をまとめて取得する */
export async function fetchTuition(filters: TuitionFilters): Promise<TuitionData> {
  const db = adminDb();
  const today = todayJst();

  const [{ data: paymentsData }, { data: studentsData }] = await Promise.all([
    db
      .from("payments")
      .select("*")
      .eq("type", "tuition")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    db.from("students").select(STUDENT_COLS).order("student_number", { ascending: true }),
  ]);

  const payments = (paymentsData ?? []) as Payment[];
  const allStudents = (studentsData ?? []) as TuitionStudent[];
  const studentById = new Map(allStudents.map((s) => [s.id, s]));

  const all: TuitionRow[] = payments.map((p) => ({
    payment: p,
    student: p.student_id ? (studentById.get(p.student_id) ?? null) : null,
    state: tuitionState(p, today),
  }));

  const summary: TuitionSummary = {
    billedTotal: all.filter((r) => r.state !== "void").reduce((sum, r) => sum + r.payment.amount, 0),
    paidTotal: all.filter((r) => r.state === "paid").reduce((sum, r) => sum + r.payment.amount, 0),
    unpaidTotal: all
      .filter((r) => r.state === "unpaid" || r.state === "overdue")
      .reduce((sum, r) => sum + r.payment.amount, 0),
    overdueCount: all.filter((r) => r.state === "overdue").length,
  };

  const rows = all.filter((r) => {
    if (filters.label && (r.payment.installment_label ?? "") !== filters.label) return false;
    if (filters.className && (r.student?.class_name ?? "") !== filters.className) return false;
    if (filters.state === "unpaid" && !(r.state === "unpaid" || r.state === "overdue")) return false;
    if (filters.state === "overdue" && r.state !== "overdue") return false;
    if (filters.state === "paid" && r.state !== "paid") return false;
    return true;
  });

  const labels = [...new Set(payments.map((p) => p.installment_label).filter((v): v is string => !!v))].sort();
  const classes = [...new Set(allStudents.map((s) => s.class_name).filter((v): v is string => !!v))].sort();

  return {
    rows,
    summary,
    labels,
    classes,
    students: allStudents.filter((s) => s.status === "enrolled"),
    today,
  };
}

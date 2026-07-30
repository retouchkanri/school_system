"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth } from "@/lib/notify";
import { siteOrigin } from "@/lib/url";
import { fmtDate, fmtYen } from "@/lib/format";
import type { Payment, Profile, Student } from "@/lib/types";
import { jstDateToTimestamp, todayJst, tuitionState, type TuitionStudent } from "./data";

export interface ActionState {
  ok?: boolean;
  error?: string;
  /** 一括請求の結果メッセージ */
  message?: string;
}

export interface ReminderState {
  ok?: boolean;
  error?: string;
  sent?: number;
}

const STUDENT_COLS = "id, name, student_number, class_name, status";

/** Postgres の enum に 'tuition' がまだ無い場合の案内 (schema.sql の未適用対策) */
function enumHint(message: string | undefined): string | null {
  if (!message) return null;
  return /invalid input value for enum|payment_type/i.test(message)
    ? "学費の種別 (payment_type='tuition') がデータベースに未登録です。supabase/schema.sql の学費セクションを実行してください。"
    : null;
}

/* ============ 請求の一括登録 ============ */

/**
 * 学費の請求 (payments.type='tuition') を対象生徒へ一括作成する。
 * 同じ生徒・同じ名目 (installment_label) の行が既にあれば作成せずスキップする。
 */
export async function createTuitionBillsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const db = adminDb();

  const target = String(formData.get("target") ?? "all");
  const className = String(formData.get("class_name") ?? "").trim();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const label = String(formData.get("installment_label") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? "").trim());
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();

  if (!label) return { error: "名目 (例: 2026年度 前期) を入力してください" };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "金額を正しく入力してください" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { error: "納付期限を入力してください" };
  if (target === "class" && !className) return { error: "クラスを選択してください" };
  if (target === "student" && !studentId) return { error: "生徒を選択してください" };

  let query = db.from("students").select(STUDENT_COLS).eq("status", "enrolled");
  if (target === "class") query = query.eq("class_name", className);
  if (target === "student") query = query.eq("id", studentId);
  const { data: studentsData, error: studentsError } = await query;
  if (studentsError) return { error: "生徒の取得に失敗しました" };

  const students = (studentsData ?? []) as TuitionStudent[];
  if (students.length === 0) return { error: "対象となる在籍生徒が見つかりませんでした" };

  // 同じ名目の既存行 (重複作成の防止)
  const { data: existingData } = await db
    .from("payments")
    .select("student_id")
    .eq("type", "tuition")
    .eq("installment_label", label)
    .in(
      "student_id",
      students.map((s) => s.id)
    );
  const already = new Set(((existingData ?? []) as { student_id: string | null }[]).map((r) => r.student_id));

  const targets = students.filter((s) => !already.has(s.id));
  const skipped = students.length - targets.length;

  if (targets.length === 0) {
    return { ok: true, message: `0件作成、${skipped}件は既に存在するためスキップしました` };
  }

  const { error } = await db.from("payments").insert(
    targets.map((s) => ({
      student_id: s.id,
      type: "tuition",
      amount: Math.round(amount),
      method: "bank_transfer",
      status: "pending",
      due_date: dueDate,
      installment_label: label,
      memo: memo || null,
    }))
  );
  if (error) return { error: enumHint(error.message) ?? "請求の作成に失敗しました" };

  revalidatePath("/admin/tuition");
  return { ok: true, message: `${targets.length}件作成、${skipped}件は既に存在するためスキップしました` };
}

/* ============ 入金の記録 / 取り消し ============ */

/** 学費の入金を記録する (銀行振込の消し込み)。status='confirmed' / paid_at=納付日 */
export async function recordTuitionPaymentAction(formData: FormData): Promise<void> {
  const profile = await requireRole("admin");
  const db = adminDb();

  const paymentId = String(formData.get("payment_id") ?? "");
  const paidOn = String(formData.get("paid_on") ?? "").trim();
  if (!paymentId || !/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) return;

  const { data } = await db.from("payments").select("*").eq("id", paymentId).maybeSingle();
  const payment = data as Payment | null;
  if (!payment || payment.type !== "tuition") return; // 学費以外は触らない

  await db
    .from("payments")
    .update({
      status: "confirmed",
      paid_at: jstDateToTimestamp(paidOn),
      confirmed_by: profile.id,
      method: payment.method ?? "bank_transfer",
    })
    .eq("id", paymentId)
    .eq("type", "tuition");

  revalidatePath("/admin/tuition");
  revalidatePath("/student/tuition");
  revalidatePath("/parent/tuition");
}

/** 入金記録を取り消して未納に戻す (誤記録の訂正用) */
export async function revertTuitionPaymentAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const db = adminDb();

  const paymentId = String(formData.get("payment_id") ?? "");
  if (!paymentId) return;

  const { data } = await db.from("payments").select("*").eq("id", paymentId).maybeSingle();
  const payment = data as Payment | null;
  if (!payment || payment.type !== "tuition") return;

  await db
    .from("payments")
    .update({ status: "pending", paid_at: null, confirmed_by: null })
    .eq("id", paymentId)
    .eq("type", "tuition");

  revalidatePath("/admin/tuition");
  revalidatePath("/student/tuition");
  revalidatePath("/parent/tuition");
}

/* ============ 未納者への催促通知 ============ */

/**
 * 納付期限を過ぎている学費について、保護者 (未登録の場合は生徒本人) へ丁寧な案内を送る。
 * 生徒ごとに1通へまとめ、督促調にならない文面にする。
 */
export async function notifyOverdueTuitionAction(
  _prev: ReminderState,
  _formData: FormData
): Promise<ReminderState> {
  await requireRole("admin");
  const db = adminDb();
  const today = todayJst();

  // 画面の絞り込み条件に関わらず、期限超過の全件をまとめて案内する
  const { data: paymentsData } = await db
    .from("payments")
    .select("*")
    .eq("type", "tuition")
    .order("due_date", { ascending: true });
  const overdue = ((paymentsData ?? []) as Payment[]).filter(
    (p) => !!p.student_id && tuitionState(p, today) === "overdue"
  );
  if (overdue.length === 0) return { error: "期限を過ぎている学費はありません" };

  const studentIds = [...new Set(overdue.map((p) => p.student_id as string))];
  const { data: studentsData } = await db
    .from("students")
    .select("id, name, student_number, user_id, parent_user_id")
    .in("id", studentIds);
  const students = (studentsData ?? []) as Pick<
    Student,
    "id" | "name" | "student_number" | "user_id" | "parent_user_id"
  >[];
  const studentById = new Map(students.map((s) => [s.id, s]));

  const profileIds = [
    ...new Set(students.flatMap((s) => [s.parent_user_id, s.user_id]).filter((v): v is string => !!v)),
  ];
  const profileById = new Map<string, Profile>();
  if (profileIds.length > 0) {
    const { data: profilesData } = await db.from("profiles").select("*").in("id", profileIds);
    for (const p of (profilesData ?? []) as Profile[]) profileById.set(p.id, p);
  }

  const origin = await siteOrigin();
  let sent = 0;

  for (const sid of studentIds) {
    const student = studentById.get(sid);
    if (!student) continue;
    const recipient =
      (student.parent_user_id ? profileById.get(student.parent_user_id) : null) ??
      (student.user_id ? profileById.get(student.user_id) : null) ??
      null;
    if (!recipient) continue;

    const items = overdue.filter((p) => p.student_id === sid);
    const total = items.reduce((sum, p) => sum + p.amount, 0);
    const lines = items
      .map((p) => `・${p.installment_label ?? "学費"} ${fmtYen(p.amount)} (納付期限: ${fmtDate(p.due_date)})`)
      .join("\n");
    const isParent = !!student.parent_user_id && recipient.id === student.parent_user_id;
    const link = isParent ? `${origin}/parent/tuition` : `${origin}/student/tuition`;

    const body =
      `${student.name}さん${isParent ? "の保護者様" : ""}\n\n` +
      `いつも本学院の教育活動にご理解とご協力をいただき、誠にありがとうございます。\n` +
      `学費の納付状況を確認いたしましたところ、下記のお支払いが確認できておりませんでしたのでご案内申し上げます。\n\n` +
      `${lines}\n\n合計: ${fmtYen(total)}\n\n` +
      `行き違いで既にお振込みいただいている場合は、何卒ご容赦ください。\n` +
      `納付状況は下記のページからもご確認いただけます。\n${link}\n\n` +
      `ご事情がある場合は、遠慮なく学院までご相談ください。分納等のご相談も承っております。\n\n` +
      `東関東馬事高等学院・東関東馬事専門学院`;

    try {
      const count = await notifyBoth(
        recipient.email,
        recipient.line_id,
        "【東関東馬事学院】学費の納付状況についてのご案内",
        body,
        "tuition_reminder"
      );
      if (count > 0) sent++;
    } catch (e) {
      console.error("[tuition] 催促通知の送信に失敗:", sid, e);
    }
  }

  revalidatePath("/admin/tuition");
  revalidatePath("/admin/notifications");
  return { ok: true, sent };
}

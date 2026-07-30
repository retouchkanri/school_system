"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";

export interface RidingActionState {
  ok?: boolean;
  error?: string;
}

/** 騎乗報告の入力値 (新規・編集で共通) */
interface RidingInput {
  horseId: string;
  reportDate: string;
  lesson: string;
  content: string;
  horseCondition: string;
  /** 落馬の有無 */
  fellOff: boolean;
  /** 乗りやすさ 1〜5 (未回答は null) */
  rideability: number | null;
  /** 馬の様子 */
  horseMood: string | null;
  /** ヒヤリハット・特記事項 */
  incident: string | null;
}

/** 乗りやすさ (1〜5) を安全に読み取る。未回答・範囲外は null */
function readRideability(formData: FormData): number | null {
  const raw = String(formData.get("rideability") ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

function readRidingInput(formData: FormData): RidingInput {
  return {
    horseId: String(formData.get("horse_id") ?? ""),
    reportDate: String(formData.get("report_date") ?? ""),
    lesson: String(formData.get("lesson") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim(),
    horseCondition: String(formData.get("horse_condition") ?? "").trim(),
    fellOff: formData.get("fell_off") === "on",
    rideability: readRideability(formData),
    horseMood: String(formData.get("horse_mood") ?? "").trim() || null,
    incident: String(formData.get("incident") ?? "").trim() || null,
  };
}

/**
 * 同一生徒 × 同一日 × 同一馬 の報告がすでにあるかを調べる。
 * excludeId を渡すとその報告自身は重複判定から除外する (編集時)。
 * DB制約ではなくアクション内チェックで実装している (schema.sql は変更しない方針のため)。
 */
async function hasDuplicateReport(
  studentId: string,
  reportDate: string,
  horseId: string,
  excludeId?: string
): Promise<boolean> {
  let query = adminDb()
    .from("riding_reports")
    .select("id")
    .eq("student_id", studentId)
    .eq("report_date", reportDate)
    .eq("horse_id", horseId);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.limit(1);
  return (data ?? []).length > 0;
}

const DUPLICATE_MESSAGE = "その日のその馬の報告は既に提出されています。編集してください。";

export async function submitRidingReport(_prev: RidingActionState, formData: FormData): Promise<RidingActionState> {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);
  if (!student) return { error: "生徒情報が登録されていません" };

  const { horseId, reportDate, lesson, content, horseCondition, fellOff, rideability, horseMood, incident } =
    readRidingInput(formData);

  if (!horseId || !reportDate || !content) return { error: "馬・日付・騎乗内容は必須です" };

  // 馬の実在確認
  const { data: horse } = await adminDb().from("horses").select("id").eq("id", horseId).maybeSingle();
  if (!horse) return { error: "選択された馬が見つかりません" };

  // 重複投稿の防止
  if (await hasDuplicateReport(student.id, reportDate, horseId)) return { error: DUPLICATE_MESSAGE };

  const { error } = await adminDb().from("riding_reports").insert({
    student_id: student.id,
    horse_id: horseId,
    report_date: reportDate,
    lesson: lesson || null,
    content,
    horse_condition: horseCondition || null,
    fell_off: fellOff,
    rideability,
    horse_mood: horseMood,
    incident,
    reported_by: profile.id,
  });
  if (error) return { error: "騎乗報告の送信に失敗しました" };

  revalidatePath("/student/riding");
  revalidatePath("/admin/riding-reports");
  revalidatePath("/admin/horses");
  revalidatePath(`/admin/horses/${horseId}`);
  return { ok: true };
}

/** 自分が提出した騎乗報告を修正する (他人の報告は編集できない) */
export async function updateRidingReport(_prev: RidingActionState, formData: FormData): Promise<RidingActionState> {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);
  if (!student) return { error: "生徒情報が登録されていません" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "不正な操作です" };

  const { horseId, reportDate, lesson, content, horseCondition, fellOff, rideability, horseMood, incident } =
    readRidingInput(formData);
  if (!horseId || !reportDate || !content) return { error: "馬・日付・騎乗内容は必須です" };

  // 所有権検証: 対象の報告が自分のものであること
  const { data: existingData } = await adminDb()
    .from("riding_reports")
    .select("id, student_id")
    .eq("id", id)
    .maybeSingle();
  const existing = (existingData as { id: string; student_id: string } | null) ?? null;
  if (!existing) return { error: "対象の騎乗報告が見つかりません" };
  if (existing.student_id !== student.id) return { error: "この騎乗報告を編集する権限がありません" };

  const { data: horse } = await adminDb().from("horses").select("id").eq("id", horseId).maybeSingle();
  if (!horse) return { error: "選択された馬が見つかりません" };

  if (await hasDuplicateReport(student.id, reportDate, horseId, id)) return { error: DUPLICATE_MESSAGE };

  const { error } = await adminDb()
    .from("riding_reports")
    .update({
      horse_id: horseId,
      report_date: reportDate,
      lesson: lesson || null,
      content,
      horse_condition: horseCondition || null,
      fell_off: fellOff,
      rideability,
      horse_mood: horseMood,
      incident,
    })
    .eq("id", id)
    .eq("student_id", student.id);
  if (error) return { error: "騎乗報告の更新に失敗しました" };

  revalidatePath("/student/riding");
  revalidatePath("/admin/riding-reports");
  revalidatePath("/admin/horses");
  revalidatePath(`/admin/horses/${horseId}`);
  return { ok: true };
}

/** 自分が提出した騎乗報告を削除する (他人の報告は削除できない) */
export async function deleteRidingReport(_prev: RidingActionState, formData: FormData): Promise<RidingActionState> {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);
  if (!student) return { error: "生徒情報が登録されていません" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "不正な操作です" };

  // 所有権検証: 対象の報告が自分のものであること
  const { data: existingData } = await adminDb()
    .from("riding_reports")
    .select("id, student_id, horse_id")
    .eq("id", id)
    .maybeSingle();
  const existing = (existingData as { id: string; student_id: string; horse_id: string } | null) ?? null;
  if (!existing) return { error: "対象の騎乗報告が見つかりません" };
  if (existing.student_id !== student.id) return { error: "この騎乗報告を削除する権限がありません" };

  const { error } = await adminDb().from("riding_reports").delete().eq("id", id).eq("student_id", student.id);
  if (error) return { error: "騎乗報告の削除に失敗しました" };

  revalidatePath("/student/riding");
  revalidatePath("/admin/riding-reports");
  revalidatePath("/admin/horses");
  if (existing.horse_id) revalidatePath(`/admin/horses/${existing.horse_id}`);
  return { ok: true };
}

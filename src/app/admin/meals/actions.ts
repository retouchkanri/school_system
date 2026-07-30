"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyStaff } from "@/lib/notify";
import { siteOrigin } from "@/lib/url";
import { fmtDate } from "@/lib/format";
import type { MealType, MealRecord } from "@/lib/types";
import { fetchMealAlerts, MEAL_ALERT_DAYS, MEAL_ALERT_THRESHOLD } from "./absence-filter";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

/** 一括登録の結果ステート (登録件数を返す) */
export interface BulkMealState {
  ok?: boolean;
  error?: string;
  created?: number;
}

/** 欠食アラートの職員通知の結果ステート (送信した職員数を返す) */
export interface MealAlertNotifyState {
  ok?: boolean;
  error?: string;
  sent?: number;
}

const VALID_MEALS: MealType[] = ["breakfast", "lunch", "dinner"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 喫食状況の登録・更新。
 * eaten / note はどちらも任意で、FormData に含まれないキーは既存レコードの値をそのまま維持する。
 * (トグル操作で理由が消える・理由の保存で○×が反転する、といった事故を防ぐため)
 */
export async function toggleMeal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const student_id = String(formData.get("student_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const meal = String(formData.get("meal") ?? "") as MealType;
  const eatenRaw = formData.get("eaten");
  const noteRaw = formData.get("note");

  if (!student_id || !DATE_RE.test(date)) return { error: "入力が不正です" };
  if (!VALID_MEALS.includes(meal)) return { error: "食事区分の値が不正です" };

  const db = adminDb();

  // 既存レコードを取得し、FormData に無い項目は引き継ぐ
  const { data: existingData } = await db
    .from("meal_records")
    .select("*")
    .eq("student_id", student_id)
    .eq("date", date)
    .eq("meal", meal)
    .maybeSingle();
  const existing = (existingData as MealRecord | null) ?? null;

  const eaten = eatenRaw == null ? (existing?.eaten ?? true) : String(eatenRaw) === "true";
  const note = noteRaw == null ? (existing?.note ?? null) : String(noteRaw).trim().slice(0, 200) || null;

  const { error } = await db
    .from("meal_records")
    .upsert({ student_id, date, meal, eaten, note }, { onConflict: "student_id,date,meal" });

  if (error) return { error: "保存に失敗しました" };

  revalidatePath("/admin/meals");
  revalidatePath("/student/meals");
  revalidatePath("/parent/meals");
  return { ok: true };
}

/**
 * 指定日・指定食事について、まだ記録が無い在籍生徒だけを eaten=true で一括登録する。
 * 既存の記録 (○ / × のどちらも) は上書きしない。
 */
export async function markAllMeals(_prev: BulkMealState, formData: FormData): Promise<BulkMealState> {
  await requireRole("admin");

  const date = String(formData.get("date") ?? "");
  const meal = String(formData.get("meal") ?? "") as MealType;

  if (!DATE_RE.test(date)) return { error: "日付が不正です" };
  if (!VALID_MEALS.includes(meal)) return { error: "食事区分の値が不正です" };

  const db = adminDb();
  const [{ data: studentsData }, { data: recordsData }] = await Promise.all([
    db.from("students").select("id").eq("status", "enrolled"),
    db.from("meal_records").select("student_id").eq("date", date).eq("meal", meal),
  ]);

  const recorded = new Set(((recordsData ?? []) as { student_id: string }[]).map((r) => r.student_id));
  const targets = ((studentsData ?? []) as { id: string }[]).filter((s) => !recorded.has(s.id));

  if (targets.length === 0) return { error: "未登録の生徒はいません" };

  const { error } = await db
    .from("meal_records")
    .upsert(
      targets.map((s) => ({ student_id: s.id, date, meal, eaten: true, note: null })),
      { onConflict: "student_id,date,meal" }
    );
  if (error) return { error: "一括登録に失敗しました" };

  revalidatePath("/admin/meals");
  revalidatePath("/student/meals");
  revalidatePath("/parent/meals");
  return { ok: true, created: targets.length };
}

/**
 * 欠食が続いている生徒の一覧を職員へメール通知する (手動実行のみ、cronは設けない)。
 * 承認済み外泊期間中の欠食は集計から除外済み。
 */
export async function notifyMealAlert(
  _prev: MealAlertNotifyState,
  formData: FormData
): Promise<MealAlertNotifyState> {
  await requireRole("admin");

  const date = String(formData.get("date") ?? "");
  if (!DATE_RE.test(date)) return { error: "日付が不正です" };

  const { from, to, alerts } = await fetchMealAlerts(date);
  if (alerts.length === 0) return { error: "通知対象の生徒はいません" };

  const origin = await siteOrigin();
  const lines = alerts.map(
    ({ student, count }) => `・${student.name}(${student.student_number}) 欠食 ${count}回`
  );
  const body = [
    `${fmtDate(from)} 〜 ${fmtDate(to)} の${MEAL_ALERT_DAYS}日間で欠食が${MEAL_ALERT_THRESHOLD}回以上あった生徒は次の${alerts.length}名です。`,
    "",
    ...lines,
    "",
    "※ 保護者が承認済みの外泊期間中の欠食は集計から除外しています。",
    "※ 体調不良や生活リズムの乱れの可能性があります。面談などのフォローをご検討ください。",
    "",
    `管理画面: ${origin}/admin/meals?date=${to}`,
  ].join("\n");

  const { data: adminsData } = await adminDb().from("profiles").select("email").eq("role", "admin");
  const adminEmails = ((adminsData ?? []) as { email: string | null }[])
    .map((a) => a.email)
    .filter(Boolean) as string[];

  const sent = await notifyStaff(
    `【東関東馬事学院】欠食が続いている生徒のお知らせ (${alerts.length}名)`,
    body,
    "meal_alert",
    adminEmails
  );

  return { ok: true, sent };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { notifyStaff } from "@/lib/notify";
import { siteOrigin } from "@/lib/url";
import { fmtDate, fmtYen } from "@/lib/format";
import type { InjuryRecord, InsuranceClaim } from "@/lib/types";

export interface InsuranceActionState {
  ok?: boolean;
  error?: string;
}

/** 職員通知の宛先 (CONTACT_RECIPIENTS 未設定時のフォールバック用に管理者のメールを集める) */
async function adminEmails(): Promise<string[]> {
  const { data } = await adminDb().from("profiles").select("email").eq("role", "admin");
  return ((data ?? []) as { email: string | null }[]).map((a) => a.email).filter(Boolean) as string[];
}

export async function submitInsuranceClaim(
  _prev: InsuranceActionState,
  formData: FormData
): Promise<InsuranceActionState> {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);
  if (!student) return { error: "生徒情報が登録されていません" };

  const injuryId = String(formData.get("injury_record_id") ?? "").trim();
  const insuranceCompany = String(formData.get("insurance_company") ?? "").trim();
  const amountRaw = String(formData.get("claim_amount") ?? "").trim();
  const summary = String(formData.get("incident_summary") ?? "").trim();

  if (!summary) return { error: "事故の概要を入力してください" };

  let claimAmount: number | null = null;
  if (amountRaw) {
    const n = Number(amountRaw);
    if (!Number.isFinite(n) || n < 0) return { error: "請求予定額は0以上の数値で入力してください" };
    claimAmount = Math.round(n);
  }

  const db = adminDb();

  // 所有権検証: 対象の怪我記録が自分のものであること
  let injury: Pick<InjuryRecord, "id" | "date" | "occurred_at" | "body_part"> | null = null;
  if (injuryId) {
    const { data } = await db
      .from("injury_records")
      .select("id, date, occurred_at, body_part")
      .eq("id", injuryId)
      .eq("student_id", student.id)
      .maybeSingle();
    injury = (data as Pick<InjuryRecord, "id" | "date" | "occurred_at" | "body_part"> | null) ?? null;
    if (!injury) return { error: "選択された怪我記録が見つかりません" };
  }

  const { error } = await db.from("insurance_claims").insert({
    injury_record_id: injury?.id ?? null,
    student_id: student.id,
    claimant_role: "student",
    submitted_by: profile.id,
    status: "submitted",
    insurance_company: insuranceCompany || null,
    claim_amount: claimAmount,
    incident_summary: summary,
    documents: [],
  });
  if (error) return { error: "申請の送信に失敗しました" };

  // 職員へ通知 (DB書き込み成功後。通知失敗が申請自体を壊さないよう try/catch)
  try {
    const adminUrl = `${await siteOrigin()}/admin/injuries`;
    await notifyStaff(
      `保険申請が届きました(${student.name})`,
      [
        `生徒: ${student.name}(${student.student_number})`,
        "申請者: 生徒本人",
        `対象の怪我: ${injury ? `${fmtDate(injury.date)}${injury.occurred_at ? ` (${injury.occurred_at})` : ""}${injury.body_part ? ` / ${injury.body_part}` : ""}` : "指定なし(直接入力)"}`,
        `保険会社: ${insuranceCompany || "—"}`,
        `請求予定額: ${claimAmount == null ? "—" : fmtYen(claimAmount)}`,
        "",
        "【事故の概要】",
        summary,
        "",
        "▼管理画面 (怪我・保険申請)",
        adminUrl,
      ].join("\n"),
      "insurance_claim",
      await adminEmails()
    );
  } catch (e) {
    console.error("[student/insurance] 職員への保険申請通知に失敗しました:", e);
  }

  revalidatePath("/student/insurance");
  revalidatePath("/parent/insurance");
  revalidatePath("/admin/injuries");
  return { ok: true };
}

/** 申請中(submitted)の申請を取り下げる (レコードごと削除する) */
export async function withdrawInsuranceClaim(
  _prev: InsuranceActionState,
  formData: FormData
): Promise<InsuranceActionState> {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);
  if (!student) return { error: "生徒情報が登録されていません" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "不正な操作です" };

  const db = adminDb();
  // 所有権検証: 自分の申請であること
  const { data } = await db.from("insurance_claims").select("*").eq("id", id).maybeSingle();
  const claim = (data as InsuranceClaim | null) ?? null;
  // 自分の生徒レコードの申請で、かつ自分が提出したものだけ取り下げ可 (保護者が出した申請は取り下げさせない)
  if (!claim || claim.student_id !== student.id || claim.submitted_by !== profile.id) {
    return { error: "この申請を操作する権限がありません" };
  }
  if (claim.status !== "submitted") return { error: "学校が確認を始めた申請は取り下げできません" };

  // submitted 条件付きで削除し、職員が処理を始めた直後の取り下げを防ぐ
  const { data: deleted, error } = await db
    .from("insurance_claims")
    .delete()
    .eq("id", id)
    .eq("status", "submitted")
    .select("id");
  if (error) return { error: "取り下げに失敗しました" };
  if (!deleted || deleted.length === 0) return { error: "学校が確認を始めた申請は取り下げできません" };

  try {
    await notifyStaff(
      `保険申請が取り下げられました(${student.name})`,
      [
        `生徒: ${student.name}(${student.student_number})`,
        "取り下げた人: 生徒本人",
        `申請日: ${fmtDate(claim.created_at)}`,
        `保険会社: ${claim.insurance_company ?? "—"}`,
        "",
        "【事故の概要】",
        claim.incident_summary,
      ].join("\n"),
      "insurance_claim",
      await adminEmails()
    );
  } catch (e) {
    console.error("[student/insurance] 取り下げ通知に失敗しました:", e);
  }

  revalidatePath("/student/insurance");
  revalidatePath("/parent/insurance");
  revalidatePath("/admin/injuries");
  return { ok: true };
}

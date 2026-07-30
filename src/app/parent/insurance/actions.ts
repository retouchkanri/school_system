"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getStudentsForParent } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { notifyStaff } from "@/lib/notify";
import { siteOrigin } from "@/lib/url";
import { fmtDate, fmtYen } from "@/lib/format";
import type { InjuryRecord, InsuranceClaim } from "@/lib/types";

export interface ParentInsuranceActionState {
  ok?: boolean;
  error?: string;
}

/** 職員通知の宛先 (CONTACT_RECIPIENTS 未設定時のフォールバック用に管理者のメールを集める) */
async function adminEmails(): Promise<string[]> {
  const { data } = await adminDb().from("profiles").select("email").eq("role", "admin");
  return ((data ?? []) as { email: string | null }[]).map((a) => a.email).filter(Boolean) as string[];
}

export async function submitParentInsuranceClaim(
  _prev: ParentInsuranceActionState,
  formData: FormData
): Promise<ParentInsuranceActionState> {
  const profile = await requireRole("parent");

  const studentId = String(formData.get("student_id") ?? "");
  const injuryId = String(formData.get("injury_record_id") ?? "").trim();
  const insuranceCompany = String(formData.get("insurance_company") ?? "").trim();
  const amountRaw = String(formData.get("claim_amount") ?? "").trim();
  const summary = String(formData.get("incident_summary") ?? "").trim();

  if (!studentId) return { error: "お子様を選択してください" };
  if (!summary) return { error: "事故の概要を入力してください" };

  let claimAmount: number | null = null;
  if (amountRaw) {
    const n = Number(amountRaw);
    if (!Number.isFinite(n) || n < 0) return { error: "請求予定額は0以上の数値で入力してください" };
    claimAmount = Math.round(n);
  }

  // 所有権検証: 対象生徒が自分の子であること
  const children = await getStudentsForParent(profile.id);
  const child = children.find((c) => c.id === studentId);
  if (!child) return { error: "この生徒の申請を行う権限がありません" };

  const db = adminDb();

  // 所有権検証: 対象の怪我記録がその子のものであること
  let injury: Pick<InjuryRecord, "id" | "date" | "occurred_at" | "body_part"> | null = null;
  if (injuryId) {
    const { data } = await db
      .from("injury_records")
      .select("id, date, occurred_at, body_part")
      .eq("id", injuryId)
      .eq("student_id", child.id)
      .maybeSingle();
    injury = (data as Pick<InjuryRecord, "id" | "date" | "occurred_at" | "body_part"> | null) ?? null;
    if (!injury) return { error: "選択された怪我記録が見つかりません" };
  }

  const { error } = await db.from("insurance_claims").insert({
    injury_record_id: injury?.id ?? null,
    student_id: child.id,
    claimant_role: "parent",
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
      `保険申請が届きました(${child.name})`,
      [
        `生徒: ${child.name}(${child.student_number})`,
        `申請者: 保護者(${profile.full_name})`,
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
    console.error("[parent/insurance] 職員への保険申請通知に失敗しました:", e);
  }

  revalidatePath("/parent/insurance");
  revalidatePath("/student/insurance");
  revalidatePath("/admin/injuries");
  return { ok: true };
}

/** 申請中(submitted)で、かつ自分が提出した申請を取り下げる (レコードごと削除する) */
export async function withdrawParentInsuranceClaim(
  _prev: ParentInsuranceActionState,
  formData: FormData
): Promise<ParentInsuranceActionState> {
  const profile = await requireRole("parent");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "不正な操作です" };

  const db = adminDb();
  const { data } = await db.from("insurance_claims").select("*").eq("id", id).maybeSingle();
  const claim = (data as InsuranceClaim | null) ?? null;
  if (!claim) return { error: "対象の申請が見つかりません" };

  // 所有権検証: 自分の子の申請で、かつ自分が提出したものだけ取り下げ可
  const children = await getStudentsForParent(profile.id);
  const child = children.find((c) => c.id === claim.student_id);
  if (!child || claim.submitted_by !== profile.id) {
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
      `保険申請が取り下げられました(${child.name})`,
      [
        `生徒: ${child.name}(${child.student_number})`,
        `取り下げた人: 保護者(${profile.full_name})`,
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
    console.error("[parent/insurance] 取り下げ通知に失敗しました:", e);
  }

  revalidatePath("/parent/insurance");
  revalidatePath("/student/insurance");
  revalidatePath("/admin/injuries");
  return { ok: true };
}

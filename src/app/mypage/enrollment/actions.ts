"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { getLeadForUser, advanceLeadStatus } from "@/lib/data";
import { UNIFORM_SIZES, BOOTS_SIZES, HELMET_SIZES } from "@/lib/constants";
import type { AdmissionDecision, Lead, Payment, Profile } from "@/lib/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

/** 入学手続きの支払い項目 (サーバー側で金額を確定する) */
const ENROLLMENT_FEES = {
  admission_fee: 300000,
  uniform: 85000,
  materials: 42000,
} as const;

type FeeType = keyof typeof ENROLLMENT_FEES;

/** 合格済みリードの取得 (合格通知済みでなければ null) */
async function getAcceptedLead(profile: Profile): Promise<Lead | null> {
  const lead = await getLeadForUser(profile.id);
  if (!lead || lead.user_id !== profile.id) return null;
  const { data } = await adminDb()
    .from("admission_decisions")
    .select("*")
    .eq("lead_id", lead.id)
    .maybeSingle();
  const decision = (data as AdmissionDecision | null) ?? null;
  if (!decision || decision.result !== "accepted" || !decision.notified_at) return null;
  return lead;
}

/** 入学手続き内容の保存 */
export async function saveEnrollmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("applicant");
  const lead = await getAcceptedLead(profile);
  if (!lead) return { error: "入学手続きは合格された方のみご利用いただけます" };

  const uniformSize = String(formData.get("uniform_size") ?? "");
  const bootsSize = String(formData.get("boots_size") ?? "");
  const helmetSize = String(formData.get("helmet_size") ?? "");
  if (uniformSize && !UNIFORM_SIZES.includes(uniformSize)) return { error: "制服サイズの値が不正です" };
  if (bootsSize && !BOOTS_SIZES.includes(bootsSize)) return { error: "ブーツサイズの値が不正です" };
  if (helmetSize && !HELMET_SIZES.includes(helmetSize)) return { error: "ヘルメットサイズの値が不正です" };

  const emergencyContacts: { name: string; relation: string; phone: string }[] = [];
  for (const i of [1, 2]) {
    const name = String(formData.get(`ec${i}_name`) ?? "").trim();
    const relation = String(formData.get(`ec${i}_relation`) ?? "").trim();
    const phone = String(formData.get(`ec${i}_phone`) ?? "").trim();
    if (name || relation || phone) emergencyContacts.push({ name, relation, phone });
  }
  if (emergencyContacts.length === 0) return { error: "緊急連絡先を1件以上ご記入ください" };

  const guarantor = {
    name: String(formData.get("g_name") ?? "").trim(),
    relation: String(formData.get("g_relation") ?? "").trim(),
    phone: String(formData.get("g_phone") ?? "").trim(),
    address: String(formData.get("g_address") ?? "").trim(),
  };

  const agreementAccepted = formData.get("agreement") === "on";
  const signature = String(formData.get("signature") ?? "").trim();
  const completed = agreementAccepted && signature.length > 0;

  const { error } = await adminDb()
    .from("enrollment_procedures")
    .upsert(
      {
        lead_id: lead.id,
        photo_submitted: formData.get("photo_submitted") === "on",
        insurance_card_submitted: formData.get("insurance_card_submitted") === "on",
        my_number_submitted: formData.get("my_number_submitted") === "on",
        uniform_size: uniformSize || null,
        boots_size: bootsSize || null,
        helmet_size: helmetSize || null,
        drivers_license: formData.get("drivers_license") === "on",
        emergency_contacts: emergencyContacts,
        guarantor,
        allergies: String(formData.get("allergies") ?? "").trim() || null,
        medications: String(formData.get("medications") ?? "").trim() || null,
        medical_conditions: String(formData.get("medical_conditions") ?? "").trim() || null,
        agreement_accepted: agreementAccepted,
        signature: signature || null,
        signed_at: completed ? new Date().toISOString() : null,
        status: completed ? "completed" : "in_progress",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lead_id" }
    );
  if (error) return { error: "手続き内容の保存に失敗しました" };

  await advanceLeadStatus(lead.id, "enrollment_procedure");

  revalidatePath("/mypage/enrollment");
  revalidatePath("/mypage");
  return { ok: true };
}

/** 入学金・制服代・教材費の支払い (カード=即時決済 / 銀行振込=振込待ち) */
export async function payEnrollmentFeeAction(formData: FormData): Promise<void> {
  const profile = await requireRole("applicant");
  const lead = await getAcceptedLead(profile);
  if (!lead) return;

  const typeRaw = String(formData.get("type") ?? "");
  const methodRaw = String(formData.get("method") ?? "");
  if (!(typeRaw in ENROLLMENT_FEES)) return;
  if (methodRaw !== "credit_card" && methodRaw !== "bank_transfer") return;
  const type = typeRaw as FeeType;

  // 二重決済防止: 同種の支払いが既にあれば何もしない
  const { data: existingData } = await adminDb()
    .from("payments")
    .select("*")
    .eq("lead_id", lead.id)
    .eq("type", type)
    .limit(1)
    .maybeSingle();
  if ((existingData as Payment | null)) return;

  const isCard = methodRaw === "credit_card";
  await adminDb().from("payments").insert({
    lead_id: lead.id,
    type,
    amount: ENROLLMENT_FEES[type],
    method: methodRaw,
    status: isCard ? "paid" : "pending",
    paid_at: isCard ? new Date().toISOString() : null,
  });

  if (isCard && type === "admission_fee") {
    await advanceLeadStatus(lead.id, "admission_fee_paid");
  }

  revalidatePath("/mypage/enrollment");
  revalidatePath("/mypage");
}

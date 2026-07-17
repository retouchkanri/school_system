import { adminDb } from "@/lib/supabase/admin";
import { statusIndex } from "@/lib/constants";
import type { Lead, LeadStatus, Payment, Student } from "@/lib/types";

/** ログインユーザーに紐づくリード(入学希望者)を取得 */
export async function getLeadForUser(userId: string): Promise<Lead | null> {
  const { data } = await adminDb()
    .from("leads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Lead) ?? null;
}

/** ログインユーザー(在校生)の生徒レコードを取得 */
export async function getStudentForUser(userId: string): Promise<Student | null> {
  const { data } = await adminDb()
    .from("students")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return (data as Student) ?? null;
}

/** 保護者ユーザーに紐づく子(生徒)レコードを取得 */
export async function getStudentsForParent(userId: string): Promise<Student[]> {
  const { data } = await adminDb().from("students").select("*").eq("parent_user_id", userId);
  return (data as Student[]) ?? [];
}

/** ステータスを前進のみ許可で更新 (後退させない) */
export async function advanceLeadStatus(leadId: string, next: LeadStatus) {
  const { data } = await adminDb().from("leads").select("status").eq("id", leadId).single();
  if (!data) return;
  if (statusIndex(next) > statusIndex(data.status as LeadStatus)) {
    await adminDb()
      .from("leads")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", leadId);
  }
}

/**
 * 決済確定処理 (pending/paid → confirmed) の共通ロジック。
 * 管理画面の手動確認ボタン (admin/payments) と Stripe Webhook の両方から呼ばれる。
 */
export async function markPaymentConfirmed(paymentId: string, confirmedBy?: string): Promise<boolean> {
  const db = adminDb();
  const { data } = await db
    .from("payments")
    .select("id, lead_id, type, status, paid_at")
    .eq("id", paymentId)
    .single();
  const payment = data as Pick<Payment, "id" | "lead_id" | "type" | "status" | "paid_at"> | null;
  if (!payment) return false;
  if (payment.status !== "pending" && payment.status !== "paid") return false;

  const { error } = await db
    .from("payments")
    .update({
      status: "confirmed",
      confirmed_by: confirmedBy ?? null,
      paid_at: payment.paid_at ?? new Date().toISOString(),
    })
    .eq("id", paymentId);
  if (error) return false;

  if (payment.lead_id) {
    if (payment.type === "admission_fee") {
      await advanceLeadStatus(payment.lead_id, "admission_fee_paid");
    } else if (payment.type === "open_campus") {
      await advanceLeadStatus(payment.lead_id, "payment_confirmed");
    }
  }
  return true;
}

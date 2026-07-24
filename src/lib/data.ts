import { adminDb } from "@/lib/supabase/admin";
import { statusIndex, PAYMENT_TYPE_LABELS } from "@/lib/constants";
import { notifyBoth } from "@/lib/notify";
import type { Lead, LeadStatus, Payment, PaymentType, Student } from "@/lib/types";

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
  const { data } = await db.from("payments").select("*").eq("id", paymentId).single();
  const payment = data as Payment | null;
  if (!payment) return false;
  // cancelled も確定可能にする: 予約キャンセル後に決済途中のカード課金や振込が実際に届いた場合、入金記録が消えないように
  if (payment.status !== "pending" && payment.status !== "paid" && payment.status !== "cancelled") return false;

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
      // 対応する見学予約の入金状態も同期する。
      // booking_id があればその予約のみ。無い(旧データ)場合は、未入金予約がちょうど1件のときだけ同期する
      // (複数イベント予約時に無関係な予約まで入金確認済みにしないため。曖昧な場合はイベント管理画面の予約単位ボタンで確認する)。
      if (payment.booking_id) {
        await db
          .from("open_campus_bookings")
          .update({ payment_status: "confirmed" })
          .eq("payment_status", "pending")
          .eq("id", payment.booking_id);
      } else {
        const { data: pendingBookings } = await db
          .from("open_campus_bookings")
          .select("id")
          .eq("lead_id", payment.lead_id)
          .eq("payment_status", "pending");
        const pending = (pendingBookings ?? []) as { id: string }[];
        if (pending.length === 1) {
          await db.from("open_campus_bookings").update({ payment_status: "confirmed" }).eq("id", pending[0].id);
        }
      }
      await advanceLeadStatus(payment.lead_id, "payment_confirmed");
    }
  }
  return true;
}

/**
 * 決済確定後、リード本人へメール+LINEで確認通知を送る。
 * Stripe Webhook / 支払いボタンの即時確定 / 管理画面の手動入金確認 の全てから共通で呼ばれる。
 */
export async function notifyPaymentConfirmed(paymentId: string) {
  const db = adminDb();
  const { data: paymentData } = await db.from("payments").select("*").eq("id", paymentId).maybeSingle();
  const payment = paymentData as Payment | null;
  if (!payment?.lead_id) return;

  const { data: leadData } = await db.from("leads").select("*").eq("id", payment.lead_id).maybeSingle();
  const lead = leadData as Lead | null;
  if (!lead) return;

  const label = PAYMENT_TYPE_LABELS[payment.type as PaymentType] ?? "お支払い";
  const isBank = payment.method === "bank_transfer";
  await notifyBoth(
    lead.email,
    lead.line_id,
    `【東関東馬事学院】${label}の${isBank ? "ご入金を確認しました" : "決済が完了しました"}`,
    isBank
      ? `${lead.name}様\n\nお振込みいただいたご入金を確認いたしました。\n\n項目: ${label}\n金額: ${payment.amount.toLocaleString()}円\n\nご確認いただきありがとうございました。`
      : `${lead.name}様\n\nクレジットカード決済が完了しました。\n\n項目: ${label}\n金額: ${payment.amount.toLocaleString()}円\n\nご確認いただきありがとうございました。`,
    "payment_confirmed"
  );
}

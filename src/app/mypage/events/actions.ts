"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { getLeadForUser, advanceLeadStatus } from "@/lib/data";
import { notifyStaff } from "@/lib/notify";
import { createCheckoutSession, stripeEnabled } from "@/lib/stripe";
import type { OpenCampusBooking, OpenCampusEvent, PaymentMethod } from "@/lib/types";

export interface BookingState {
  ok?: boolean;
  error?: string;
  bank?: boolean; // 銀行振込を選択した場合 true (振込案内を表示)
}

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** 見学・オープンキャンパスの仮予約 + 参加費決済 */
export async function bookEventAction(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);
  if (!lead || lead.user_id !== profile.id) return { error: "リード情報が見つかりません" };

  const eventId = String(formData.get("event_id") ?? "");
  const methodRaw = String(formData.get("payment_method") ?? "");
  if (methodRaw !== "credit_card" && methodRaw !== "bank_transfer") {
    return { error: "決済方法を選択してください" };
  }
  const method: PaymentMethod = methodRaw;
  if (method === "credit_card" && !stripeEnabled()) {
    return { error: "現在オンラインカード決済は準備中です。お手数ですが銀行振込をご選択ください。" };
  }

  const { data: eventData } = await adminDb()
    .from("open_campus_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  const event = (eventData as OpenCampusEvent | null) ?? null;
  if (!event) return { error: "イベントが見つかりません" };

  // 既存予約チェック (キャンセル済みなら再予約として更新)
  const { data: existingData } = await adminDb()
    .from("open_campus_bookings")
    .select("*")
    .eq("lead_id", lead.id)
    .eq("event_id", event.id)
    .maybeSingle();
  const existing = (existingData as OpenCampusBooking | null) ?? null;
  if (existing && existing.status !== "cancelled") return { error: "このイベントはすでに仮予約済みです" };

  const { error: bookingError } = await adminDb()
    .from("open_campus_bookings")
    .upsert(
      {
        lead_id: lead.id,
        event_id: event.id,
        status: "reserved",
        payment_method: method,
        payment_status: "pending",
      },
      { onConflict: "lead_id,event_id" }
    );
  if (bookingError) return { error: "仮予約の登録に失敗しました" };

  const { data: paymentData, error: paymentError } = await adminDb()
    .from("payments")
    .insert({ lead_id: lead.id, type: "open_campus", amount: event.fee, method, status: "pending" })
    .select("id")
    .single();
  if (paymentError || !paymentData) return { error: "決済情報の作成に失敗しました" };

  await advanceLeadStatus(lead.id, "visit_reserved");
  revalidatePath("/mypage/events");
  revalidatePath("/mypage");

  if (method === "credit_card") {
    const origin = await siteOrigin();
    const url = await createCheckoutSession({
      paymentId: paymentData.id,
      amount: event.fee,
      description: `見学・オープンキャンパス参加費 (${event.title})`,
      customerEmail: lead.email,
      successUrl: `${origin}/mypage/events?stripe=success`,
      cancelUrl: `${origin}/mypage/events?stripe=cancel`,
    });
    if (!url) return { error: "決済ページの作成に失敗しました" };
    redirect(url);
  }

  return { ok: true, bank: true };
}

/** 予約のキャンセル */
export async function cancelBookingAction(formData: FormData): Promise<void> {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);
  if (!lead || lead.user_id !== profile.id) return;

  const bookingId = String(formData.get("booking_id") ?? "");
  const { data } = await adminDb()
    .from("open_campus_bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  const booking = (data as OpenCampusBooking | null) ?? null;
  if (!booking || booking.lead_id !== lead.id) return; // 自分の予約のみ
  if (booking.status !== "reserved") return;

  await adminDb().from("open_campus_bookings").update({ status: "cancelled" }).eq("id", booking.id);

  revalidatePath("/mypage/events");
  revalidatePath("/mypage");
}

/** C判定などで個別相談を希望する場合、全管理者へ軽量に通知するだけのアクション (新規テーブル不要) */
export async function requestIndividualConsultationAction(_formData: FormData): Promise<void> {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);
  if (!lead || lead.user_id !== profile.id) return;

  const { data: adminsData } = await adminDb().from("profiles").select("email").eq("role", "admin");
  const adminEmails = ((adminsData ?? []) as { email: string | null }[]).map((a) => a.email).filter(Boolean) as string[];

  await notifyStaff(
    "【個別相談希望】仮審査アンケート回答者より",
    `${lead.name}様(${lead.email ?? "メール未登録"} / ${lead.phone ?? "電話番号未登録"})が個別相談を希望しています。担当者よりご連絡をお願いします。`,
    "consultation_request",
    adminEmails
  );

  revalidatePath("/mypage/events");
}

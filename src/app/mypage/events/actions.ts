"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { getLeadForUser, advanceLeadStatus } from "@/lib/data";
import { notifyBoth } from "@/lib/notify";
import { fmtDate, fmtYen } from "@/lib/format";
import type { OpenCampusBooking, OpenCampusEvent, PaymentMethod } from "@/lib/types";

export interface BookingState {
  ok?: boolean;
  error?: string;
  bank?: boolean; // 銀行振込を選択した場合 true (振込案内を表示)
}

/** 見学・オープンキャンパスの予約 + 参加費決済 */
export async function bookEventAction(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);
  if (!lead || lead.user_id !== profile.id) return { error: "リード情報が見つかりません" };
  if (lead.ai_judgement !== "approved" && lead.ai_judgement !== "caution") {
    return { error: "現在ご予約いただけません。担当者へお問い合わせください" };
  }

  const eventId = String(formData.get("event_id") ?? "");
  const methodRaw = String(formData.get("payment_method") ?? "");
  if (methodRaw !== "credit_card" && methodRaw !== "bank_transfer") {
    return { error: "決済方法を選択してください" };
  }
  const method: PaymentMethod = methodRaw;

  const { data: eventData } = await adminDb()
    .from("open_campus_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  const event = (eventData as OpenCampusEvent | null) ?? null;
  if (!event) return { error: "イベントが見つかりません" };

  const paymentStatus = method === "credit_card" ? "paid" : "pending";

  // 既存予約チェック (キャンセル済みなら再予約として更新)
  const { data: existingData } = await adminDb()
    .from("open_campus_bookings")
    .select("*")
    .eq("lead_id", lead.id)
    .eq("event_id", event.id)
    .maybeSingle();
  const existing = (existingData as OpenCampusBooking | null) ?? null;
  if (existing && existing.status !== "cancelled") return { error: "このイベントはすでに予約済みです" };

  const { error: bookingError } = await adminDb()
    .from("open_campus_bookings")
    .upsert(
      {
        lead_id: lead.id,
        event_id: event.id,
        status: "reserved",
        payment_method: method,
        payment_status: paymentStatus,
      },
      { onConflict: "lead_id,event_id" }
    );
  if (bookingError) return { error: "予約の登録に失敗しました" };

  await adminDb().from("payments").insert({
    lead_id: lead.id,
    type: "open_campus",
    amount: event.fee,
    method,
    status: paymentStatus,
    paid_at: method === "credit_card" ? new Date().toISOString() : null,
  });

  await advanceLeadStatus(lead.id, "visit_reserved");

  if (method === "credit_card") {
    await advanceLeadStatus(lead.id, "payment_confirmed");
    await notifyBoth(
      lead.email,
      lead.line_id,
      "【東関東馬事学院】見学・オープンキャンパス予約確認",
      `${lead.name}様\n\n以下のとおりご予約を承りました。\n\nイベント: ${event.title}\n日程: ${fmtDate(event.event_date)} ${event.start_time ?? ""}\n参加費: ${fmtYen(event.fee)} (クレジットカード決済済み)\n\n当日お会いできることを楽しみにしております。`,
      "booking"
    );
  }

  revalidatePath("/mypage/events");
  revalidatePath("/mypage");
  return { ok: true, bank: method === "bank_transfer" };
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

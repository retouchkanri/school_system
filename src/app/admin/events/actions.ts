"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { advanceLeadStatus, markPaymentConfirmed, notifyPaymentConfirmed } from "@/lib/data";

export interface EventActionState {
  ok?: boolean;
  error?: string;
}

/** イベント新規作成 */
export async function createEventAction(
  _prev: EventActionState,
  formData: FormData
): Promise<EventActionState> {
  await requireRole("admin");

  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");
  if (!title || !eventDate) return { error: "タイトルと開催日は必須です" };

  const capacityRaw = Number(formData.get("capacity"));
  const feeRaw = Number(formData.get("fee"));
  const capacity = Number.isFinite(capacityRaw) && capacityRaw > 0 ? Math.floor(capacityRaw) : 20;
  const fee = Number.isFinite(feeRaw) && feeRaw >= 0 ? Math.floor(feeRaw) : 8000;

  const { error } = await adminDb().from("open_campus_events").insert({
    title,
    event_date: eventDate,
    start_time: String(formData.get("start_time") ?? "") || null,
    capacity,
    fee,
    description: String(formData.get("description") ?? "").trim() || null,
  });
  if (error) return { error: "イベントの作成に失敗しました" };

  revalidatePath("/admin/events");
  return { ok: true };
}

/** 銀行振込の入金を確認 (予約 + payments を confirmed に) */
export async function confirmBankTransferAction(formData: FormData): Promise<void> {
  const profile = await requireRole("admin");
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!bookingId) return;

  const db = adminDb();
  const { data } = await db
    .from("open_campus_bookings")
    .select("id, lead_id")
    .eq("id", bookingId)
    .single();
  const booking = data as { id: string; lead_id: string } | null;
  if (!booking) return;

  await db.from("open_campus_bookings").update({ payment_status: "confirmed" }).eq("id", bookingId);

  // 対応する参加費決済レコードを入金確認済みに。
  // booking_id で紐付いた決済を優先し、無ければ(旧データ) 同リードの open_campus 決済にフォールバック。
  const { data: linkedData } = await db
    .from("payments")
    .select("id")
    .eq("booking_id", bookingId)
    .in("status", ["pending", "paid"]);
  let paymentIds = ((linkedData ?? []) as { id: string }[]).map((p) => p.id);
  if (paymentIds.length === 0) {
    const { data: fallbackData } = await db
      .from("payments")
      .select("id")
      .eq("lead_id", booking.lead_id)
      .eq("type", "open_campus")
      .in("status", ["pending", "paid"]);
    paymentIds = ((fallbackData ?? []) as { id: string }[]).map((p) => p.id);
  }
  for (const id of paymentIds) {
    const confirmed = await markPaymentConfirmed(id, profile.id);
    if (confirmed) await notifyPaymentConfirmed(id);
  }

  await advanceLeadStatus(booking.lead_id, "payment_confirmed");
  revalidatePath("/admin/events");
  revalidatePath("/admin/payments");
}

/** 参加済みにする */
export async function markAttendedAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!bookingId) return;

  const db = adminDb();
  const { data } = await db
    .from("open_campus_bookings")
    .select("id, lead_id")
    .eq("id", bookingId)
    .single();
  const booking = data as { id: string; lead_id: string } | null;
  if (!booking) return;

  await db.from("open_campus_bookings").update({ status: "attended" }).eq("id", bookingId);
  await advanceLeadStatus(booking.lead_id, "visit_attended");
  revalidatePath("/admin/events");
}

/** 予約をキャンセルする */
export async function cancelBookingAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!bookingId) return;

  await adminDb().from("open_campus_bookings").update({ status: "cancelled" }).eq("id", bookingId);
  // 未入金の参加費決済レコードはキャンセル扱いに (削除しない: 後から届く課金・入金と照合できるように)
  await adminDb().from("payments").update({ status: "cancelled" }).eq("booking_id", bookingId).eq("status", "pending");
  revalidatePath("/admin/events");
  revalidatePath("/admin/payments");
}

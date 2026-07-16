"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { advanceLeadStatus } from "@/lib/data";

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

  // 対応する参加費決済レコードも入金確認済みに
  const { data: paymentsData } = await db
    .from("payments")
    .select("id, paid_at")
    .eq("lead_id", booking.lead_id)
    .eq("type", "open_campus")
    .in("status", ["pending", "paid"]);
  const payments = (paymentsData ?? []) as { id: string; paid_at: string | null }[];
  for (const p of payments) {
    await db
      .from("payments")
      .update({
        status: "confirmed",
        confirmed_by: profile.id,
        paid_at: p.paid_at ?? new Date().toISOString(),
      })
      .eq("id", p.id);
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
  revalidatePath("/admin/events");
}

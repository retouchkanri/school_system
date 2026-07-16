"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { advanceLeadStatus } from "@/lib/data";
import type { Payment } from "@/lib/types";

/** 入金確認 (pending / paid → confirmed) */
export async function confirmPaymentAction(formData: FormData): Promise<void> {
  const profile = await requireRole("admin");
  const paymentId = String(formData.get("payment_id") ?? "");
  if (!paymentId) return;

  const db = adminDb();
  const { data } = await db
    .from("payments")
    .select("id, lead_id, type, status, paid_at")
    .eq("id", paymentId)
    .single();
  const payment = data as Pick<Payment, "id" | "lead_id" | "type" | "status" | "paid_at"> | null;
  if (!payment) return;
  if (payment.status !== "pending" && payment.status !== "paid") return;

  const { error } = await db
    .from("payments")
    .update({
      status: "confirmed",
      confirmed_by: profile.id,
      paid_at: payment.paid_at ?? new Date().toISOString(),
    })
    .eq("id", paymentId);
  if (error) return;

  if (payment.lead_id) {
    if (payment.type === "admission_fee") {
      await advanceLeadStatus(payment.lead_id, "admission_fee_paid");
    } else if (payment.type === "open_campus") {
      await advanceLeadStatus(payment.lead_id, "payment_confirmed");
    }
  }

  revalidatePath("/admin/payments");
}

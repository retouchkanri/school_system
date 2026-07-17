"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { markPaymentConfirmed } from "@/lib/data";

/** 入金確認 (pending / paid → confirmed) — 銀行振込など手動確認が必要な決済用 */
export async function confirmPaymentAction(formData: FormData): Promise<void> {
  const profile = await requireRole("admin");
  const paymentId = String(formData.get("payment_id") ?? "");
  if (!paymentId) return;

  await markPaymentConfirmed(paymentId, profile.id);
  revalidatePath("/admin/payments");
}

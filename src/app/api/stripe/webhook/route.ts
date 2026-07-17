import { NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { markPaymentConfirmed } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth } from "@/lib/notify";
import { PAYMENT_TYPE_LABELS } from "@/lib/constants";
import type { Lead, Payment, PaymentType } from "@/lib/types";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "signature missing" }, { status: 400 });

  const rawBody = await request.text();
  let event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  if (!event) return NextResponse.json({ error: "stripe not configured" }, { status: 503 });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { metadata?: Record<string, string> | null };
    const paymentId = session.metadata?.payment_id;
    if (paymentId) {
      const confirmed = await markPaymentConfirmed(paymentId);
      if (confirmed) await notifyPaymentConfirmed(paymentId);
    }
  }

  return NextResponse.json({ received: true });
}

/** 決済確定後、リード本人へ確認メールを送る */
async function notifyPaymentConfirmed(paymentId: string) {
  const db = adminDb();
  const { data: paymentData } = await db.from("payments").select("*").eq("id", paymentId).maybeSingle();
  const payment = paymentData as Payment | null;
  if (!payment?.lead_id) return;

  const { data: leadData } = await db.from("leads").select("*").eq("id", payment.lead_id).maybeSingle();
  const lead = leadData as Lead | null;
  if (!lead) return;

  const label = PAYMENT_TYPE_LABELS[payment.type as PaymentType] ?? "お支払い";
  await notifyBoth(
    lead.email,
    lead.line_id,
    `【東関東馬事学院】${label}の決済が完了しました`,
    `${lead.name}様\n\nクレジットカード決済が完了しました。\n\n項目: ${label}\n金額: ${payment.amount.toLocaleString()}円\n\nご確認いただきありがとうございました。`,
    "payment_confirmed"
  );
}

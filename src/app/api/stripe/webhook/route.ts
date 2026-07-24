import { NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { markPaymentConfirmed, notifyPaymentConfirmed } from "@/lib/data";

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

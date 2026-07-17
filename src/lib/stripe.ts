import Stripe from "stripe";

/**
 * Stripe決済モジュール。
 * STRIPE_SECRET_KEY が設定されていれば実際にCheckout Sessionを作成する。
 * 未設定の場合は null を返すので、呼び出し側は「オンライン決済は準備中です」表示にフォールバックすること。
 */

let _stripe: Stripe | null | undefined;

function stripeClient(): Stripe | null {
  if (_stripe !== undefined) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  _stripe = key ? new Stripe(key) : null;
  return _stripe;
}

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export interface CreateCheckoutSessionInput {
  paymentId: string;
  amount: number;
  description: string;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
}

/** 指定した payments 行に対する Stripe Checkout Session を作成し、遷移先URLを返す */
export async function createCheckoutSession(input: CreateCheckoutSessionInput): Promise<string | null> {
  const client = stripeClient();
  if (!client) return null;

  const session = await client.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: input.customerEmail ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "jpy",
          unit_amount: Math.round(input.amount),
          product_data: { name: input.description },
        },
        quantity: 1,
      },
    ],
    metadata: { payment_id: input.paymentId },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });

  return session.url;
}

/** Webhookの署名検証付きイベント構築。STRIPE_WEBHOOK_SECRET 未設定なら null */
export function constructWebhookEvent(rawBody: string, signature: string): Stripe.Event | null {
  const client = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!client || !secret) return null;
  return client.webhooks.constructEvent(rawBody, signature, secret);
}

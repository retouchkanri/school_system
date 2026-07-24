/**
 * 開発フェーズ判定。
 * NODE_ENV=development または DEV_SKIP_PAYMENT=1 のとき有効。
 * (AI仮審査を常に「承認」として先へ進める等、デモ・開発向けの挙動に使用)
 */
export function isDevPhase(): boolean {
  return process.env.NODE_ENV === "development" || process.env.DEV_SKIP_PAYMENT === "1";
}

/**
 * 決済スキップ判定。
 * 既定では、支払いボタンを押した時点で「入金確認済み」として次のページへ進む(実際の課金は行わない)。
 * PAYMENT_MODE=stripe を設定した場合のみ、実際の Stripe Checkout へ遷移して課金する。
 */
export function skipPaymentInDev(): boolean {
  return process.env.PAYMENT_MODE !== "stripe";
}

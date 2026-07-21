/**
 * 開発フェーズ判定。
 * NODE_ENV=development または DEV_SKIP_PAYMENT=1 のとき有効。
 */
export function isDevPhase(): boolean {
  return process.env.NODE_ENV === "development" || process.env.DEV_SKIP_PAYMENT === "1";
}

/** 開発フェーズ向けの決済スキップ判定 */
export function skipPaymentInDev(): boolean {
  return isDevPhase();
}

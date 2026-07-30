/**
 * 怪我・保険ページ(保護者)のローカル定数 (src/lib/constants.ts は編集禁止のためここに置く)。
 * サーバー・クライアントの両方から参照するため独立モジュールにしている。
 */
import type { BadgeTone } from "@/components/ui";
import type { InsuranceClaimStatus } from "@/lib/types";

/** 怪我の程度ごとのバッジ色 */
export const SEVERITY_TONES: Record<string, BadgeTone> = {
  軽傷: "gray",
  通院: "amber",
  入院: "red",
  その他: "blue",
};

/** 保険申請の状態ごとのバッジ色 */
export const CLAIM_STATUS_TONES: Record<InsuranceClaimStatus, BadgeTone> = {
  draft: "gray",
  submitted: "amber",
  reviewing: "blue",
  approved: "green",
  rejected: "red",
  paid: "brand",
};

/** 申請者から見た状態の説明 */
export const CLAIM_STATUS_HINTS: Record<InsuranceClaimStatus, string> = {
  draft: "下書きです",
  submitted: "学校で受付しました。確認をお待ちください",
  reviewing: "学校が内容を確認しています",
  approved: "承認されました。手続きが進みます",
  rejected: "今回は承認されませんでした",
  paid: "お支払いが完了しました",
};

/** 申請者の表示名 */
export function claimantLabel(role: string | null): string {
  return role === "parent" ? "保護者" : role === "student" ? "本人" : "—";
}

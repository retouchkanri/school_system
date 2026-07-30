/**
 * 怪我・保険申請ページのローカル定数。
 * (src/lib/constants.ts は編集禁止のため、この機能でしか使わない値はここに置く)
 * サーバー(page.tsx / actions.ts)とクライアント(フォーム)の両方から参照するため独立モジュールにしている。
 */
import type { BadgeTone } from "@/components/ui";
import type { InsuranceClaimStatus } from "@/lib/types";

/** 怪我の程度ごとのバッジ色 (軽傷=gray / 通院=amber / 入院=red) */
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

/**
 * 職員が現在の状態から進められる次の状態。
 * 申請済 → 確認中 → 承認 or 却下 → 支払済 という流れを基本とし、
 * 却下からの差し戻し(再確認)だけ例外的に許可する。
 */
export const NEXT_CLAIM_STATUSES: Record<InsuranceClaimStatus, InsuranceClaimStatus[]> = {
  draft: [],
  submitted: ["reviewing", "approved", "rejected"],
  reviewing: ["approved", "rejected"],
  approved: ["paid", "rejected"],
  rejected: ["reviewing"],
  paid: [],
};

/** 職員が設定できる状態 (サーバー側バリデーション用。draft/submitted は申請者側の状態なので含めない) */
export const ADMIN_SETTABLE_STATUSES: InsuranceClaimStatus[] = [
  "reviewing",
  "approved",
  "rejected",
  "paid",
];

/** 状態を進めるボタンの文言 */
export const CLAIM_ACTION_LABELS: Record<InsuranceClaimStatus, string> = {
  draft: "下書きに戻す",
  submitted: "申請済に戻す",
  reviewing: "確認中にする",
  approved: "承認する",
  rejected: "却下する",
  paid: "支払済にする",
};

/** 申請者の表示名 */
export function claimantLabel(role: string | null): string {
  return role === "parent" ? "保護者" : role === "student" ? "本人" : "—";
}

/** 生徒の在籍状態のサフィックス (セレクトの表示用) */
export const STUDENT_STATE_SUFFIX: Record<string, string> = {
  enrolled: "",
  graduated: " ※卒業",
  withdrawn: " ※退学",
};

/**
 * 年度(4月〜翌3月)の開始日 YYYY-04-01 を返す。
 * ホストのタイムゾーンがUTCでも日本時間基準で判定されるように +9h して計算する。
 */
export function fiscalYearStart(now: Date = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = jst.getUTCMonth() + 1;
  return `${m >= 4 ? y : y - 1}-04-01`;
}

/** 研修カテゴリのホワイトリスト (サーバー/クライアント両方から参照するため独立モジュールに置く) */
export const TRAINING_CATEGORIES = ["校外研修", "資格", "講習", "実習"];

/** 生徒の在籍状態ラベル (constants.ts は編集禁止のためローカル定義) */
export const STUDENT_STATE_SUFFIX: Record<string, string> = {
  enrolled: "",
  graduated: " ※卒業",
  withdrawn: " ※退学",
};

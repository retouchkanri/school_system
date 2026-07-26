import { INTRO_VIDEO_URL } from "@/lib/constants";

/**
 * 資料請求の自動返信メール(マイページのご案内)の件名・本文。
 *
 * 資料請求フォーム送信 → 顧客情報をDBに登録 → マイページアカウント自動作成 →
 * SMTPサーバーから本メールを自動送信 → ユーザーがメール内URLからログイン
 * という流れの「自動返信メール」に相当する。
 *
 * 資料請求アクション ([src/app/request/actions.ts]) と
 * 送信テスト用エンドポイント ([src/app/api/dev/email-diagnostic]) の双方から使用する。
 */

export const WELCOME_SUBJECT = "【東関東馬事学院】資料請求ありがとうございます(マイページのご案内)";

export interface WelcomeEmailParams {
  /** 申込者名 */
  name: string;
  /** ログイン用メールアドレス */
  email: string;
  /** 初回パスワードが「生年月日8桁」で使えるか (既存アカウントの場合は false) */
  birthDateLogin: boolean;
  /** サイトの絶対オリジン (例: https://example.com) */
  origin: string;
}

const LINE = "──────────────────────────";

export function welcomeEmailBody({ name, email, birthDateLogin, origin }: WelcomeEmailParams): string {
  const loginUrl = `${origin}/login`;
  const surveyUrl = `${origin}/mypage/survey`;
  const eventsUrl = `${origin}/mypage/events`;
  const contactEmail = process.env.CONTACT_EMAIL || "";

  const passwordSection = birthDateLogin
    ? `【初回パスワード】
ご登録いただいた生年月日8桁
例：2010年1月2日の場合「20100102」

セキュリティ保護のため、初回ログイン後にパスワードの変更をお願いいたします。
パスワードはマイページの「アカウント設定」からいつでも変更いただけます。`
    : `【パスワード】
すでにお持ちのアカウントのパスワードでログインしてください。
パスワードがご不明な場合は、ログイン画面の「パスワードをお忘れの方」から再設定いただけます。`;

  return `${name} 様

この度は、本校の資料をご請求いただき、誠にありがとうございます。

${name}様専用のマイページをご用意いたしました。

マイページへログインしていただくと、以下の内容をご確認・お申し込みいただけます。

（1）学校紹介動画（約5分）
（2）入学仮審査（お試し）アンケート
（3）学校見学・オープンキャンパスのお申し込み

下記のURLよりマイページへログインしてください。

【マイページURL】
${loginUrl}

【ログインID】
${email}
（資料請求時にご登録いただいたメールアドレスです）

${passwordSection}

${LINE}
■ 各メニューのご案内
${LINE}

（1）学校紹介動画（約5分）
　学院の雰囲気・寮生活・実習の様子をご覧いただけます。
　下記URLからそのままご覧いただけます。
　${INTRO_VIDEO_URL}

（2）入学仮審査（お試し）アンケート
　ご回答内容をもとに、あなたに合ったサポート内容をご提案いたします。
　${surveyUrl}
　※ 本メールに申込用紙(Word)も添付しております。

（3）学校見学・オープンキャンパスのお申し込み
　実際に馬と触れ合い、学院での一日を体験していただけます。
　${eventsUrl}
　※ 本メールに申込用紙(Word)も添付しております。

（2）（3）はマイページへログイン後にご利用いただけます。

パンフレットは追ってご郵送いたします。到着まで今しばらくお待ちください。

ご不明な点がございましたら、お気軽にお問い合わせください。
今後とも何卒よろしくお願いいたします。

${LINE}
東関東馬事高等学院・東関東馬事専門学院${contactEmail ? `\nお問い合わせ: ${contactEmail}` : ""}
${LINE}
`;
}

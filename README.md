# 東関東馬事高等学院・東関東馬事専門学院 統合管理システム

資料請求 → AI事前審査 → 見学・オープンキャンパス → 出願・適性検査 → 合否 → 入学手続き → 在校生管理(出欠・食事・騎乗報告・外泊承認・一斉配信) → リタッチ馬の月次AI報告まで、学院の業務を一元管理する統合プラットフォームです。

- フレームワーク: **Next.js 15** (App Router / TypeScript / Tailwind CSS v4)
- データベース・認証: **Supabase**
- AI分析: **OpenAI (OPENAI_API_KEY)** による自然文分析 + サイト常設AIチャットボット (未設定でも内蔵ルールベース分析で常に動作)

---

## セットアップ手順 (3ステップ)

### 1. データベーススキーマの適用 (初回のみ・1分)

Supabase の API ではテーブル作成ができないため、この1回だけ手動操作が必要です。

1. [Supabase Dashboard](https://supabase.com/dashboard) → 対象プロジェクト → **SQL Editor** を開く
2. [`supabase/schema.sql`](supabase/schema.sql) の内容を全てコピーして貼り付け、**Run** を実行

### 2. デモユーザーとサンプルデータの投入

```bash
npm install
npm run setup
```

全データを入れ直す場合: `npm run setup -- --force`

### 3. 起動

```bash
npm run dev
```

→ http://localhost:3000

---

## 初期アカウント (npm run setup で投入される開発用アカウント)

ログイン画面には表示されません。開発・検証用にこの一覧を参照してください。管理者アカウントは `/admin/users` からいつでも追加・編集・削除できます。

| ロール | メールアドレス | パスワード | 入口 |
|---|---|---|---|
| 管理者(職員) | admin@bajigakuin.jp | admin123456 | /admin |
| 職員(入試担当) | staff@bajigakuin.jp | staff123456 | /admin |
| 入学希望者 | applicant@example.com | applicant123 | /mypage |
| 在校生 | student1@example.com | student123 | /student |
| 在校生2 | student2@example.com | student123 | /student |
| 保護者 | parent1@example.com | parent123 | /parent |
| 一口支援者 | supporter1@example.com | supporter123 | /supporter |

実際の入学希望者アカウントは `/request` (資料請求フォーム) からの送信時に自動発行されます。ログインはメールアドレス+生年月日(半角数字8桁、例: `20250102`)で行い、パスワードはログイン後 `/account` からいつでも変更できます。

---

## 機能マップ

### 公開ページ
- `/` — 学院紹介トップ
- `/request` — **資料請求フォーム** (取得項目: 氏名・フリガナ・学年・生年月日(必須)・性別・学校名・保護者氏名・住所・電話・メール・LINE・希望学科・興味のある仕事・馬経験・流入経路)。送信と同時にマイページアカウントを自動発行し(メールアドレス+生年月日でログイン可)、案内メールを自動送信します。

### 管理画面 `/admin` (職員用)
| 画面 | 機能 |
|---|---|
| ダッシュボード | 18段階の入学ファネル、フォロー対象件数、要対応アラート |
| リード管理 | 一覧・検索・詳細。資料発送・担当者割当・ステータス管理・仮審査結果閲覧・マイページアカウント発行(未発行分の救済用) |
| フォロー対象 | 「動画視聴済みアンケート未回答」「回答済み見学予約なし」「体験後14日出願なし」を自動抽出しメール/LINEフォロー |
| 見学・OC | イベント作成、予約者管理、**カード(Stripe)/銀行振込の入金確認**、参加チェック |
| 出願・適性検査 | 出願書類確認、面接日設定、**適性検査AIレポート閲覧** |
| 合否管理 | 合否登録 → メール/LINE/郵送で自動通知、同封書類チェック |
| 入学手続き | 提出物・サイズ・規約同意・電子署名の確認、制服注文→入寮準備→入学式の進行 |
| 入金管理 | 参加費・入学金・制服代・教材費の入金確認 |
| 在校生管理 | 生徒台帳、**日次出欠(欠席・遅刻・早退)**、**食事(食べた/食べない)**、騎乗報告日報、研修管理、**外泊届(保護者承認状況)**、定期アンケート |
| 馬管理 | 馬台帳、**リタッチ馬の月次AI要約生成→一口支援者へ共有** |
| 配信 | 対象別お知らせ配信、生徒/保護者一斉メール・LINE、送信ログ |
| システム管理 | **管理者・職員アカウントの追加/編集/削除**、全ユーザー(入学希望者・在校生・保護者・支援者)の閲覧・編集 |

### 入学希望者マイページ `/mypage`
進捗トラッカー → 紹介動画視聴(視聴率記録) → 入学仮審査アンケート(ルールベースで**A/B/C判定**を即時表示。C判定でも見学予約はブロックせず「個別相談」導線を提示) → 見学・オープンキャンパス仮予約+決済(Stripe カード/銀行振込) → 学校見学後アンケート(満足度・入学希望度など★評価込み) → 出願+作文 → **性格・適性検査100問**(8特性+騎手/厩務員/牧場/インストラクター適性) → 合否確認 → 入学手続き(サイズ・緊急連絡先・保証人・規約同意・電子署名・入学金等の支払い) → 入学者専用ページ

### 在校生 `/student` / 保護者 `/parent` / 一口支援者 `/supporter`
- 在校生: 出欠・騎乗報告提出・研修・**外泊届提出**・食事記録・定期アンケート回答・お知らせ
- 保護者: **外泊届のワンタップ承認/却下**・子の出欠/食事閲覧・お知らせ
- 支援者: 支援馬のプロフィールと**毎月のAI月次報告**

---

## 環境変数 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=...      # 設定済み
NEXT_PUBLIC_SUPABASE_ANON_KEY=... # 設定済み
SUPABASE_SERVICE_ROLE_KEY=...     # 設定済み

# AI分析 + AIチャットボット: OPENAI_API_KEY を設定するとOpenAIによる自然文生成に切替 (未設定でもルールベースで常に動作)
# OPENAI_API_KEY=sk-proj-...   # 設定済み (OPENAI_API_KEY優先、ANTHROPIC_API_KEY はフォールバック)

# メール実配信: NOTIFY_TRANSPORT=smtp (または SMTP_HOST 設定) でSMTP、それ以外は RESEND_API_KEY があれば Resend。
# どちらも未設定なら送信ログのみ記録される。
# NOTIFY_TRANSPORT=smtp
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=465
# SMTP_SECURE=true
# SMTP_USER=...
# SMTP_PASS=...
# MAIL_FROM=...
# MAIL_FROM_NAME="東関東馬事学院 事務局"
# CONTACT_EMAIL=...            # 送信メールの Reply-To として使用
# CONTACT_RECIPIENTS=a@x,b@y   # 個別相談希望などの職員向け通知の送信先 (カンマ区切り、未設定なら管理者アカウントのメールへ)
# RESEND_API_KEY=re_...        # NOTIFY_TRANSPORT!=smtp の場合に使用

# LINE実配信 (LINE Messaging API): 未設定の場合は送信ログのみ記録される
# LINE_CHANNEL_ACCESS_TOKEN=...  # 送信用チャネルアクセストークン
# LINE_CHANNEL_SECRET=...        # Webhook署名検証用 (友だち追加からのアカウント自動連携に必要)
# NEXT_PUBLIC_LINE_ADD_FRIEND_URL=https://lin.ee/xxxx  # サイト右側LINEボタンのリンク先(公式アカウントの友だち追加URL)

# 決済モード: 既定では支払いボタン押下で即時「入金確認済み」となり次のページへ進む(実課金なし)。
# 実際にStripe Checkoutで課金する場合のみ設定:
# PAYMENT_MODE=stripe

# オンラインカード決済 (Stripe): 未設定の場合は「準備中」表示にフォールバックし、銀行振込のみ案内される
# STRIPE_SECRET_KEY=sk_live_... (またはテスト用 sk_test_...) — sk_live_ は本番課金が発生するため取り扱い注意
# STRIPE_WEBHOOK_SECRET=whsec_...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # 現状のCheckoutリダイレクト方式では未使用 (将来Stripe.js/Elementsを使う場合用)
```

## メール / LINE 連携について

`NOTIFY_TRANSPORT=smtp`(または `SMTP_HOST`)設定時はSMTP、それ以外で `RESEND_API_KEY` があればResend、`LINE_CHANNEL_ACCESS_TOKEN` があればLINEで、[`src/lib/notify.ts`](src/lib/notify.ts) が実際にメール・LINEを配信します。未設定の間は従来通り `notifications` テーブルへ送信ログとして記録するのみで、管理画面の「送信ログ」で確認できます(実配信・ログ記録のどちらの場合も、送信内容は必ずログに残ります)。個別相談希望などの職員向け通知は `notifyStaff()` 経由で送られ、`CONTACT_RECIPIENTS` が設定されていればそこへ、未設定なら管理者ロールの登録メールアドレスへ届きます。

### LINEアカウント自動連携 (Webhook)

LINEへのプッシュ送信には、相手が学院の公式アカウントを友だち追加した際の **LINE userId** が必要です。[`src/app/api/line/webhook/route.ts`](src/app/api/line/webhook/route.ts) がこの連携を自動化します:

1. LINE Developersコンソールで Messaging API チャネルを作成し、`LINE_CHANNEL_ACCESS_TOKEN` と `LINE_CHANNEL_SECRET` を設定
2. Webhook URL に `https://<本番ドメイン>/api/line/webhook` を登録し、Webhookを有効化
3. 生徒・保護者が公式アカウントを友だち追加すると、あいさつメッセージが届き、**登録済みメールアドレスをトークに送信するだけ**で leads / profiles の `line_id` に自動紐付けされる
4. 以後、合否通知・入金確認・一斉配信などの全通知がメールに加えてLINEにも届く

サイト右側の「LINE」ボタンのリンク先は `NEXT_PUBLIC_LINE_ADD_FRIEND_URL` で公式アカウントの友だち追加URLに設定できます。

## 決済 (Stripe) について

**既定の動作**: 支払いボタン(見学参加費・入学金・制服代・教材費)を押すと、その場で「入金確認済み」となり、本人へメール+LINEで確認通知が送られ、次のページへ進みます(実際のカード課金は行いません)。

**実課金モード**: `PAYMENT_MODE=stripe` を設定すると、カード決済が [`src/lib/stripe.ts`](src/lib/stripe.ts) 経由で実際のStripe Checkoutに接続されます。決済確定はWebhook (`/api/stripe/webhook`, `STRIPE_WEBHOOK_SECRET` が必要) で受け取り、[`src/lib/data.ts`](src/lib/data.ts) の `markPaymentConfirmed` で確定処理を行います(支払いボタン即時確定・管理画面の手動入金確認ボタンと共通のロジックで、いずれの経路でも本人へ確認通知が送られます)。

- Stripeダッシュボードで Webhook エンドポイント `https://<本番ドメイン>/api/stripe/webhook` を登録し、イベント `checkout.session.completed` を有効にしてください。
- ローカル検証: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

銀行振込の振込先情報は [`src/lib/constants.ts`](src/lib/constants.ts) の `BANK_TRANSFER_INFO` 一箇所で管理しています(現在は実際の振込先を設定済み)。振込先が変わった場合はこの値のみ差し替えれば全画面に反映されます。

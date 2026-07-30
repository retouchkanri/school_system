import Anthropic from "@anthropic-ai/sdk";
import { PRE_SCREENING_QUESTIONS, POST_VISIT_QUESTIONS, RIDEABILITY_LABELS } from "@/lib/constants";
import { APTITUDE_QUESTIONS, type TraitKey } from "@/lib/aptitude";
import { isDevPhase } from "@/lib/dev";
import type { AiJudgement } from "@/lib/types";

/**
 * AI分析モジュール。
 * OPENAI_API_KEY が設定されていれば OpenAI で自然文の分析を生成する(本システムの標準構成)。
 * OPENAI_API_KEY が無く ANTHROPIC_API_KEY がある場合は Claude を使用し、
 * どちらも未設定の場合は決定的なルールベース分析にフォールバックする(デモでも常に動作)。
 */

const hasClaude = () => !!process.env.ANTHROPIC_API_KEY;
const hasOpenAI = () => !!process.env.OPENAI_API_KEY;
const hasAI = () => hasClaude() || hasOpenAI();

async function askClaude(prompt: string): Promise<string | null> {
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : null;
  } catch {
    return null; // API障害時もルールベースへフォールバック
  }
}

async function askOpenAI(prompt: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

/** OPENAI_API_KEY を優先し、なければ ANTHROPIC_API_KEY で自然文生成。両方未設定/失敗時は null (ルールベースへフォールバック) */
async function askAI(prompt: string): Promise<string | null> {
  if (hasOpenAI()) {
    const text = await askOpenAI(prompt);
    if (text) return text;
  }
  if (hasClaude()) return askClaude(prompt);
  return null;
}

/* ============ ステップ2: 仮審査アンケートのAI判定 ============ */

export interface PreScreeningAnalysis {
  type: string;
  summary: string;
  judgement: AiJudgement;
}

export async function analyzePreScreening(
  answers: Record<string, string>
): Promise<PreScreeningAnalysis> {
  const rule = ruleBasedPreScreening(answers);
  if (hasAI()) {
    const qa = PRE_SCREENING_QUESTIONS.map((q) => `${q.text}: ${answers[q.id] ?? "(未回答)"}`).join("\n");
    const text = await askAI(
      `あなたは馬の学校(東関東馬事高等学院)の入学審査担当AIです。以下の入学仮審査アンケートの回答を読み、` +
        `(1)「○○タイプ」という一言のタイプ名、(2)担当者向けの3〜4文の要約(性格・適性・サポートが必要な点)を日本語で書いてください。` +
        `フォーマット:\n1行目: タイプ名のみ\n2行目以降: 要約\n\n回答:\n${qa}`
    );
    if (text) {
      const lines = text.trim().split("\n").filter(Boolean);
      return {
        type: lines[0].replace(/^タイプ名[::]?\s*/, "").trim(),
        summary: lines.slice(1).join("\n").trim() || rule.summary,
        judgement: rule.judgement,
      };
    }
  }
  return rule;
}

/**
 * ルールベースの入学仮審査判定。
 * 業務ルール: 「現在の出席状況」「馬に乗ったことはありますか」の回答は
 * 依頼仕様の通り合否判定には一切用いない(スタッフ参考情報として summary にのみ記載)。
 * 判定は 全寮制/共同生活/動物のお世話/体力 の4設問の強い不安の件数のみで行う。
 */
function ruleBasedPreScreening(answers: Record<string, string>): PreScreeningAnalysis {
  const positives: string[] = [];
  const concerns: string[] = [];
  let cautionCount = 0;

  const dorm = answers["dorm_life"] ?? "";
  if (dorm === "問題ない") positives.push("全寮制についても前向きに捉えている");
  else if (dorm === "とても不安") {
    cautionCount++;
    const detail = (answers["dorm_life_worry"] ?? "").trim();
    concerns.push(`全寮制について強い不安がある${detail ? `(${detail.slice(0, 60)})` : ""}`);
  }

  const group = answers["group_life"] ?? "";
  if (group === "楽しみ") positives.push("共同生活を楽しみにしている");
  else if (group === "不安") {
    cautionCount++;
    const detail = (answers["group_life_worry"] ?? "").trim();
    concerns.push(`共同生活に不安がある${detail ? `(${detail.slice(0, 60)})` : ""}`);
  }

  const animal = answers["animal_care"] ?? "";
  if (animal === "好き") positives.push("動物のお世話が好き");
  else if (animal === "不安") {
    cautionCount++;
    concerns.push("動物のお世話に不安がある");
  }

  const fitness = answers["physical_fitness"] ?? "";
  if (fitness === "自信がある") positives.push("体力に自信がある");
  else if (fitness === "少し不安") {
    cautionCount++;
    concerns.push("体力面にやや不安がある");
  }

  // 開発フェーズ中は、回答内容にかかわらず必ず「承認」として次のページへ進めるようにする
  const judgement: AiJudgement = isDevPhase()
    ? "approved"
    : cautionCount >= 2
      ? "rejected"
      : cautionCount === 1
        ? "caution"
        : "approved";

  // 職業志向からタイプ名を生成 (合否には影響しない)
  const jobs = (answers["future_jobs"] ?? "").split("、").map((s) => s.trim()).filter(Boolean);
  const careerIntent = answers["horse_career_intent"] ?? "";
  let type: string;
  if (jobs.includes("騎手")) type = "騎手志望タイプ";
  else if (jobs.some((j) => j.includes("厩務員"))) type = "厩務員志望タイプ";
  else if (jobs.some((j) => j.includes("牧場"))) type = "牧場スタッフ志望タイプ";
  else if (jobs.includes("乗馬クラブ")) type = "乗馬インストラクター志望タイプ";
  else if (careerIntent === "とても思う") type = "馬にまっすぐタイプ";
  else if (positives.length >= 3) type = "前向き・順応タイプ";
  else type = "じっくり見極めタイプ";

  const why = (answers["why_school"] ?? "").trim();
  const dream = (answers["future_dream"] ?? "").trim();
  const summaryParts: string[] = [];
  if (why) summaryParts.push(`志望理由: 「${why.slice(0, 60)}${why.length > 60 ? "…" : ""}」。`);
  if (dream) summaryParts.push(`将来の夢: 「${dream.slice(0, 40)}${dream.length > 40 ? "…" : ""}」。`);
  if (positives.length) summaryParts.push(positives.join("。") + "。");
  if (concerns.length) summaryParts.push("スタッフ確認事項: " + concerns.join("。") + "。");
  const tuition = answers["tuition_concern"] ?? "";
  if (tuition && tuition !== "問題ない") {
    summaryParts.push(`学費について「${tuition}」の意向あり。学費相談のご案内を推奨。`);
  }
  // 出席状況・乗馬経験は判定に使わないが、参考情報として残す
  const attendance = answers["attendance"] ?? "";
  if (attendance && attendance !== "毎日通っている") {
    summaryParts.push(`現在の出席状況: 「${attendance}」(この点は合否判定には用いていません)。`);
  }

  return {
    type,
    summary: summaryParts.join(" ") || "回答内容から特筆すべき懸念は見られません。",
    judgement,
  };
}

/* ============ 学校見学後アンケートから入学確率 ============ */

export function computeEnrollmentProbability(answers: Record<string, string> | null): number {
  let p = 40;
  if (!answers) return p;

  const satisfaction = Number(answers["satisfaction"] ?? "0");
  if (satisfaction >= 1 && satisfaction <= 5) p += (satisfaction - 3) * 10; // -20〜+20

  const intent = Number(answers["enrollment_intent"] ?? "0");
  if (intent >= 1 && intent <= 5) p += (intent - 3) * 14; // -28〜+28 (最も強いシグナル)

  const worries = (answers["life_worries"] ?? "").split("、").map((s) => s.trim()).filter(Boolean);
  if (worries.includes("特になし")) p += 5;
  else if (worries.length > 0) p -= Math.min(worries.length, 4) * 3;

  const tuition = answers["tuition_installment"] ?? "";
  if (tuition && tuition !== "特に考えていない") p -= 3; // 分割希望 = 学費への懸念の軽微なシグナル

  return Math.max(3, Math.min(98, Math.round(p)));
}

export interface ExperienceAnalysis {
  probability: number;
  /** 本人向けの返信メッセージ (点数・合否には触れない) */
  message: string;
}

const EXPERIENCE_FALLBACK_MESSAGE =
  "本日はご参加いただき誠にありがとうございました。いただいたご感想は今後の学校づくりの参考にさせていただきます。ご不安な点があれば、いつでもお気軽にご相談ください。";

/** 体験終了アンケートをAIが分析し、入学確率の推定と本人向けメッセージを生成する */
export async function analyzeExperienceSurvey(answers: Record<string, string>): Promise<ExperienceAnalysis> {
  const ruleProbability = computeEnrollmentProbability(answers);

  if (hasAI()) {
    const qa = POST_VISIT_QUESTIONS.map((q) => `${q.text}: ${answers[q.id] || "(未回答)"}`).join("\n");
    const text = await askAI(
      `あなたは馬の学校(東関東馬事高等学院)の入学相談担当AIです。学校見学・体験に参加した生徒からのアンケート回答を読み、` +
        `(1)入学確率を0〜100の整数で推定し、(2)本人へ向けた温かい返信メッセージを日本語で3〜4文書いてください。` +
        `メッセージは本人が直接読むものなので、点数・確率・合否には一切触れず、感想への共感、不安点があれば安心材料の提示、入学への前向きな後押しを含めてください。\n` +
        `フォーマット:\n1行目: 確率の数値のみ\n2行目以降: メッセージ本文\n\n回答:\n${qa}`
    );
    if (text) {
      const lines = text.trim().split("\n").filter(Boolean);
      const parsed = parseInt(lines[0]?.replace(/[^0-9]/g, "") ?? "", 10);
      const probability = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : ruleProbability;
      const message = lines.slice(1).join("\n").trim();
      if (message) return { probability, message };
    }
  }

  return { probability: ruleProbability, message: EXPERIENCE_FALLBACK_MESSAGE };
}

/* ============ ステップ5: 適性検査の採点とレポート ============ */

export interface AptitudeResult {
  scores: Record<TraitKey, number>;
  suitability: Record<string, number>;
  report: string;
}

export async function analyzeAptitude(answers: Record<string, number>): Promise<AptitudeResult> {
  const sums: Record<TraitKey, { total: number; count: number }> = {
    leader: { total: 0, count: 0 },
    steady: { total: 0, count: 0 },
    sensitivity: { total: 0, count: 0 },
    stress: { total: 0, count: 0 },
    animal: { total: 0, count: 0 },
    group_life: { total: 0, count: 0 },
    dorm: { total: 0, count: 0 },
    service: { total: 0, count: 0 },
  };
  for (const q of APTITUDE_QUESTIONS) {
    const v = answers[q.id];
    if (v >= 1 && v <= 5) {
      sums[q.trait].total += v;
      sums[q.trait].count++;
    }
  }
  const scores = Object.fromEntries(
    (Object.keys(sums) as TraitKey[]).map((k) => [
      k,
      sums[k].count ? Math.round(((sums[k].total / sums[k].count - 1) / 4) * 100) : 50,
    ])
  ) as Record<TraitKey, number>;

  const suitability = {
    jockey: Math.round(0.3 * scores.stress + 0.3 * scores.animal + 0.25 * scores.steady + 0.15 * scores.leader),
    groom: Math.round(0.35 * scores.animal + 0.3 * scores.steady + 0.2 * scores.sensitivity + 0.15 * scores.dorm),
    ranch: Math.round(0.3 * scores.animal + 0.25 * scores.steady + 0.25 * scores.group_life + 0.2 * scores.stress),
    instructor: Math.round(0.35 * scores.service + 0.25 * scores.leader + 0.2 * scores.animal + 0.2 * scores.sensitivity),
  };

  const report = buildAptitudeReport(scores, suitability);

  if (hasAI()) {
    const text = await askAI(
      `あなたは馬の学校の適性検査分析AIです。以下のスコア(0-100)から、受験生の性格・適性レポートを日本語で5〜6文で書いてください。` +
        `強みを先に、サポートが必要な点を後に。\n特性: ${JSON.stringify(scores)}\n職業適性: ${JSON.stringify(suitability)}`
    );
    if (text) return { scores, suitability, report: text.trim() };
  }
  return { scores, suitability, report };
}

const TRAIT_JA: Record<TraitKey, string> = {
  leader: "リーダーシップ",
  steady: "継続力",
  sensitivity: "感受性",
  stress: "ストレス耐性",
  animal: "動物適性",
  group_life: "集団適性",
  dorm: "寮適性",
  service: "接客適性",
};

function buildAptitudeReport(scores: Record<TraitKey, number>, suitability: Record<string, number>): string {
  const sorted = (Object.entries(scores) as [TraitKey, number][]).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 2);
  const low = sorted[sorted.length - 1];
  const jobJa: Record<string, string> = {
    jockey: "騎手",
    groom: "厩務員",
    ranch: "牧場スタッフ",
    instructor: "乗馬インストラクター",
  };
  const bestJob = Object.entries(suitability).sort((a, b) => b[1] - a[1])[0];

  const typeLabel =
    top[0][0] === "leader"
      ? "リーダータイプ"
      : top[0][0] === "steady"
        ? "コツコツタイプ"
        : top[0][0] === "sensitivity"
          ? "感受性豊かなタイプ"
          : top[0][0] === "animal"
            ? "動物大好きタイプ"
            : top[0][0] === "service"
              ? "ホスピタリティタイプ"
              : "バランスタイプ";

  const lines = [
    `総合判定: ${typeLabel}。`,
    `特に「${TRAIT_JA[top[0][0]]}」(${top[0][1]}点)と「${TRAIT_JA[top[1][0]]}」(${top[1][1]}点)が高く、大きな強みです。`,
    `職業適性では「${jobJa[bestJob[0]]}向き」が${bestJob[1]}点で最も高い結果となりました。`,
  ];
  if (low[1] < 45) {
    lines.push(`一方「${TRAIT_JA[low[0]]}」(${low[1]}点)はやや低めのため、入学後は担当スタッフによるサポートを推奨します。`);
  } else {
    lines.push("全体的にバランスが良く、大きな懸念点は見られません。");
  }
  return lines.join(" ");
}

/* ============ ステップ6: 合否判定 (書類選考・面接なし) ============ */

/** 面接を伴わない書類選考における合格基準 (総合評価スコア50点以上で合格) */
export const DOCUMENT_ONLY_ACCEPT_THRESHOLD = 50;

export interface AdmissionDecisionInput {
  aptitudeScores: Record<TraitKey, number> | null;
  aptitudeSuitability: Record<string, number> | null;
  enrollmentProbability: number | null; // leads.ai_enrollment_probability (見学後アンケート由来)
  preScreeningSummary: string | null; // leads.ai_summary
  documentsSubmittedCount: number; // 0-3 (入学願書・顔写真・成績証明書)
  hasEssay: boolean;
}

export interface AdmissionDecisionResult {
  probability: number; // 0-100
  result: "accepted" | "rejected";
  summary: string; // 判定理由 (スタッフ向け)
}

/** 書類選考のみ(面接なし)の受験生について、これまでの提出データからAIが合否を即時判定する */
export async function analyzeAdmissionDecision(input: AdmissionDecisionInput): Promise<AdmissionDecisionResult> {
  const aptitudeAvg = input.aptitudeScores
    ? Math.round(
        Object.values(input.aptitudeScores).reduce((a, b) => a + b, 0) / Object.values(input.aptitudeScores).length
      )
    : 50;
  const bestSuitability = input.aptitudeSuitability
    ? Math.max(...Object.values(input.aptitudeSuitability))
    : 50;
  const enrollmentProbability = input.enrollmentProbability ?? 50;
  const docScore = Math.round((input.documentsSubmittedCount / 3) * 100);
  const documentCompleteness = Math.round(docScore * 0.7 + (input.hasEssay ? 100 : 0) * 0.3);

  const probability = Math.max(
    0,
    Math.min(
      100,
      Math.round(enrollmentProbability * 0.3 + aptitudeAvg * 0.3 + bestSuitability * 0.2 + documentCompleteness * 0.2)
    )
  );
  const result: "accepted" | "rejected" = probability >= DOCUMENT_ONLY_ACCEPT_THRESHOLD ? "accepted" : "rejected";

  const rule =
    `総合評価スコア ${probability}点(書類選考の合格基準: ${DOCUMENT_ONLY_ACCEPT_THRESHOLD}点以上)。` +
    `適性検査平均${aptitudeAvg}点・最高適性${bestSuitability}点、見学後アンケートの入学確率${enrollmentProbability}%、` +
    `提出書類${input.documentsSubmittedCount}/3件・作文${input.hasEssay ? "あり" : "なし"}を基に算出しました。`;

  if (hasAI()) {
    const text = await askAI(
      `あなたは馬の学校(東関東馬事高等学院)の入学選考委員AIです。書類選考のみ(面接なし)の受験生について、` +
        `以下のデータをもとに選考結果への短いコメントを日本語で3〜4文書いてください。合否そのものの再判定は不要です(結果は別途システムが算出済みです)。` +
        `受験生の強み、あるいは合格基準に届かなかった場合の理由を客観的かつ丁寧に述べてください。\n` +
        `適性検査平均スコア: ${aptitudeAvg}点\n最も適性の高い職業スコア: ${bestSuitability}点\n` +
        `見学後アンケートの入学確率: ${enrollmentProbability}%\n提出書類: ${input.documentsSubmittedCount}/3件、作文: ${input.hasEssay ? "あり" : "なし"}\n` +
        `総合評価スコア: ${probability}点 (${result === "accepted" ? "合格ラインに到達" : "合格ラインに未到達"})` +
        (input.preScreeningSummary ? `\n仮審査時のコメント: ${input.preScreeningSummary}` : "")
    );
    if (text) return { probability, result, summary: text.trim() };
  }

  return { probability, result, summary: rule };
}

/* ============ リタッチ馬 月次要約 ============ */

export interface ReportForSummary {
  report_date: string;
  content: string;
  horse_condition: string | null;
  /**
   * 生徒名。参加人数の集計と職員画面での元データ確認にのみ使う。
   * 支援者は学院外部の方なので、AIプロンプトにもレポート本文にも氏名は渡さない。
   */
  student_name?: string;
  /** 乗りやすさ 1〜5 (null / 未指定 = 未回答) ※後方互換のため任意 */
  rideability?: number | null;
  /** 馬の機嫌・気性 (落ち着いていた / やや興奮 / 興奮していた 等) ※後方互換のため任意 */
  horse_mood?: string | null;
  /** ヒヤリハット・特記事項 (内部の安全管理記録) ※後方互換のため任意 */
  incident?: string | null;
  /** 落馬の有無 (内部の安全管理記録) ※後方互換のため任意 */
  fell_off?: boolean;
}

/** その月の騎乗報告から集計した「レポートの材料」。職員が生成前に内容を確認する画面でも使う。 */
export interface HorseMonthMaterials {
  /** 騎乗報告の件数 */
  reportCount: number;
  /** 関わった生徒の人数 (student_name のユニーク数) */
  studentCount: number;
  /** 乗りやすさの平均 (小数第1位)。回答が1件も無ければ null */
  rideabilityAvg: number | null;
  /** 乗りやすさの回答件数 */
  rideabilityCount: number;
  /** 乗りやすさの内訳 (スコア降順) */
  rideabilityBreakdown: { score: number; count: number }[];
  /** 馬の様子の内訳 (件数降順) */
  moodBreakdown: { mood: string; count: number }[];
  /** 馬の状態メモ (新しい順に最大3件) */
  conditions: string[];
  /** 生徒の生のコメント (重複除去のうえ最大6件・各120字まで) */
  voices: string[];
  /** ヒヤリハットの記録件数 (内部管理用) */
  incidentCount: number;
  /** 落馬の記録件数 (内部管理用) */
  fellOffCount: number;
}

/** 騎乗報告の配列から月次レポートの材料を集計する (AIパス・ルールベースパス・職員画面で共用) */
export function computeHorseMonthMaterials(reports: ReportForSummary[]): HorseMonthMaterials {
  const students = new Set<string>();
  const scores: number[] = [];
  const scoreCount: Record<number, number> = {};
  const moodCount: Record<string, number> = {};
  const conditions: string[] = [];
  const voices: string[] = [];
  let incidentCount = 0;
  let fellOffCount = 0;

  for (const r of reports) {
    const name = (r.student_name ?? "").trim();
    if (name) students.add(name);

    const score = typeof r.rideability === "number" ? r.rideability : null;
    if (score !== null && Number.isFinite(score) && score >= 1 && score <= 5) {
      const s = Math.round(score);
      scores.push(s);
      scoreCount[s] = (scoreCount[s] ?? 0) + 1;
    }

    const mood = (r.horse_mood ?? "").trim();
    if (mood) moodCount[mood] = (moodCount[mood] ?? 0) + 1;

    const condition = (r.horse_condition ?? "").trim();
    if (condition) conditions.push(condition);

    const content = (r.content ?? "").trim();
    if (content) voices.push(content.length > 120 ? `${content.slice(0, 120)}…` : content);

    if ((r.incident ?? "").trim()) incidentCount++;
    if (r.fell_off) fellOffCount++;
  }

  return {
    reportCount: reports.length,
    studentCount: students.size,
    rideabilityAvg: scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null,
    rideabilityCount: scores.length,
    rideabilityBreakdown: Object.entries(scoreCount)
      .map(([score, count]) => ({ score: Number(score), count }))
      .sort((a, b) => b.score - a.score),
    moodBreakdown: Object.entries(moodCount)
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count),
    conditions: conditions.slice(-3).reverse(),
    voices: Array.from(new Set(voices)).slice(0, 6),
    incidentCount,
    fellOffCount,
  };
}

/**
 * 一口支援者向け月次レポートのAIプロンプトを組み立てる。
 *
 * 【落馬・ヒヤリハットの扱いについて (重要な配慮)】
 * 一口支援者は学院の外部の方であり、このレポートは「支援している馬のひと月」を
 * 楽しみに読むものである。一方 fell_off / incident は学院内部の安全管理のための記録で、
 * そのまま外部へ出すと支援者に不必要な不安を与え、その馬に「危険な馬」という
 * 誤った印象を与えかねない (支援の打ち切りにもつながりうる)。
 * そのため件数・原文は「内部記録」として明示的に区別して渡し、
 * 本文へは前向きな描写としてのみ反映するようAIに指示する。
 * ただし「終始おだやかでした」のような事実に反する断定で塗りつぶすことは
 * 支援者への不誠実にあたるため、事実を歪めない・健康上の問題を隠さないことも併せて指示する。
 *
 * 【生徒名について】
 * 支援者は外部の方のため、生徒の氏名は個人情報として一切プロンプトに含めない
 * (材料として渡すのは人数とコメント本文のみ)。加えて匿名で書くよう明示する。
 */
function buildHorseMonthPrompt(
  horseName: string,
  year: number,
  month: number,
  m: HorseMonthMaterials,
  incidentNotes: string[]
): string {
  const sections: string[] = [];

  const stats: string[] = [
    `・騎乗/活動の記録: ${m.reportCount}件`,
    `・関わった生徒: ${m.studentCount}名 (氏名は伏せています)`,
  ];
  if (m.rideabilityAvg !== null) {
    const breakdown = m.rideabilityBreakdown
      .map((b) => {
        const label = RIDEABILITY_LABELS[b.score] || String(b.score);
        return `${label}(${b.score}点) ${b.count}件`;
      })
      .join(" / ");
    stats.push(
      `・生徒がつけた「乗りやすさ」: 5点満点中 平均${m.rideabilityAvg.toFixed(1)}点 (回答${m.rideabilityCount}件、内訳: ${breakdown})`
    );
  } else {
    stats.push("・生徒がつけた「乗りやすさ」: 今月は評価の記入がありませんでした");
  }
  if (m.moodBreakdown.length > 0) {
    stats.push(`・その日の馬の様子: ${m.moodBreakdown.map((b) => `${b.mood} ${b.count}件`).join(" / ")}`);
  }
  if (m.conditions.length > 0) {
    stats.push(`・馬の状態メモ(新しい順): ${m.conditions.map((c) => `「${c}」`).join(" ")}`);
  }
  sections.push(`■ 今月の記録(集計)\n${stats.join("\n")}`);

  if (m.voices.length > 0) {
    sections.push(
      `■ 生徒たちの声(騎乗報告の原文。氏名は伏せています)\n` +
        m.voices.map((v, i) => `${i + 1}. 「${v}」`).join("\n")
    );
  }

  // 内部記録は「支援者向け文面にそのまま書かない材料」として明確に区別して渡す
  if (m.fellOffCount > 0 || m.incidentCount > 0) {
    const internal: string[] = [];
    if (m.fellOffCount > 0) internal.push(`・気を張る場面の記録: ${m.fellOffCount}件`);
    if (m.incidentCount > 0) internal.push(`・ヒヤリハットの記録: ${m.incidentCount}件`);
    if (incidentNotes.length > 0) {
      internal.push(...incidentNotes.map((n) => `・(記録内容) ${n}`));
    }
    sections.push(
      `■ 内部記録(学院内部の安全管理記録。数値も語句も支援者向け文面にそのまま書かないこと)\n${internal.join("\n")}`
    );
  }

  const rules = [
    "1. 生徒の氏名は一切書かず、「生徒たち」「ある生徒」のように匿名で書いてください。",
    "2. 「生徒たちの声」を活かし、その馬らしい具体的なエピソードを1〜2つ織り込んでください。原文の丸写しではなく、支援者に伝わる言葉へ温かく再構成してください。",
    "3. 「内部記録」に落馬やヒヤリハットの記載があっても、支援者を不安にさせる表現(落馬・事故・危険・ケガ 等の語)は使わないでください。馬の個性や成長、生徒たちの学びとして前向きに描写してください。",
    "4. ただし事実を歪めることは絶対にしないでください。健康上の問題や気を張る場面があったのに「終始おだやかでした」と断定するような書き方は禁止です。「気の張る日もありましたが、スタッフが付き添い落ち着いて過ごせました」のように誠実に表現してください。",
    "5. 数字の羅列ではなく、支援者がその馬のひと月を思い浮かべられる読み物にしてください。",
    "6. 最後はご支援への感謝の言葉で締めくくってください。",
  ];

  return (
    `あなたは馬の学校(東関東馬事高等学院)のリタッチ馬(引退馬支援)月次レポート作成AIです。\n` +
    `一口支援者の皆さまへお届けする、${horseName}号の${year}年${month}月のご報告文を日本語で250〜350字で書いてください。\n\n` +
    `${sections.join("\n\n")}\n\n` +
    `■ 執筆ルール\n${rules.join("\n")}\n\n` +
    `本文のみを出力してください(見出し・箇条書き・前置き・後書きは不要です)。`
  );
}

/**
 * AIキーが無い / API呼び出しが失敗したときのルールベース月次レポート。
 * AIパスと同じ材料(乗りやすさ平均・生徒数・馬の様子・生徒の声)を織り込み、
 * AIが使えなくても支援者へそのまま出せる水準の文章を返す。
 * 落馬・ヒヤリハットの扱いはAIパスと同じ方針 (件数や「落馬」の語は出さず、
 * 事実を歪めない範囲で「気を張る場面もあった」というニュアンスに留める)。
 */
function ruleBasedHorseMonthSummary(
  horseName: string,
  year: number,
  month: number,
  m: HorseMonthMaterials
): string {
  if (m.reportCount === 0) {
    return `${year}年${month}月の${horseName}号は、騎乗記録はありませんでしたが、スタッフによる日々のケアのもと穏やかに過ごしています。引き続き温かく見守りいただけますと幸いです。`;
  }

  const lines: string[] = [
    `${year}年${month}月の${horseName}号のご報告です。`,
    m.studentCount > 0
      ? `今月は${m.reportCount}回の騎乗・活動記録があり、${m.studentCount}名の生徒たちが日々の手入れと騎乗を担当しました。`
      : `今月は${m.reportCount}回の騎乗・活動記録がありました。`,
  ];

  if (m.rideabilityAvg !== null) {
    const nearest = Math.min(5, Math.max(1, Math.round(m.rideabilityAvg)));
    lines.push(
      `生徒たちがつけた「乗りやすさ」は5点満点中 平均${m.rideabilityAvg.toFixed(1)}点(${m.rideabilityCount}件の回答)で、「${RIDEABILITY_LABELS[nearest]}」という声が中心でした。`
    );
  }
  if (m.moodBreakdown.length > 0) {
    const top = m.moodBreakdown[0];
    lines.push(`日々の様子は「${top.mood}」との報告が最も多く(${top.count}件)、${horseName}号らしい表情を見せてくれました。`);
  }
  if (m.voices.length > 0) {
    lines.push(`生徒からは「${m.voices[0]}」といった声が届いています。`);
  }
  if (m.conditions.length > 0) {
    lines.push(`馬の状態については「${m.conditions[0]}」と報告されています。`);
  }
  if (m.fellOffCount > 0 || m.incidentCount > 0) {
    lines.push(
      "気を張る場面もありましたが、その都度スタッフが付き添い、馬にも生徒にも無理のないペースで稽古を進めています。"
    );
  }
  lines.push("支援者の皆さまの温かいご支援に、生徒・スタッフ一同心より感謝申し上げます。");
  return lines.join(" ");
}

/**
 * リタッチ馬の月次レポートを生成する。
 * AIが使える場合は生徒たちの生の声を材料に温かく再構成し、
 * 使えない/失敗した場合は同じ材料からルールベースで組み立てる (二段フォールバック)。
 */
export async function summarizeHorseMonth(
  horseName: string,
  year: number,
  month: number,
  reports: ReportForSummary[]
): Promise<string> {
  const materials = computeHorseMonthMaterials(reports);

  if (hasAI() && reports.length > 0) {
    const incidentNotes = reports
      .map((r) => (r.incident ?? "").trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((n) => (n.length > 100 ? `${n.slice(0, 100)}…` : n));
    const text = await askAI(buildHorseMonthPrompt(horseName, year, month, materials, incidentNotes));
    if (text) return text.trim();
  }

  return ruleBasedHorseMonthSummary(horseName, year, month, materials);
}

import Anthropic from "@anthropic-ai/sdk";
import { PRE_SCREENING_QUESTIONS } from "@/lib/constants";
import { APTITUDE_QUESTIONS, TraitKey } from "@/lib/aptitude";
import type { AiJudgement } from "@/lib/types";

/**
 * AI分析モジュール。
 * ANTHROPIC_API_KEY が設定されていれば Claude で自然文の分析を生成し、
 * 未設定の場合は決定的なルールベース分析にフォールバックする(デモでも常に動作)。
 */

const hasClaude = () => !!process.env.ANTHROPIC_API_KEY;

async function askClaude(prompt: string): Promise<string | null> {
  if (!hasClaude()) return null;
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : null;
  } catch {
    return null; // API障害時もルールベースへフォールバック
  }
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
  if (hasClaude()) {
    const qa = PRE_SCREENING_QUESTIONS.map((q) => `${q.text}: ${answers[q.id] ?? "(未回答)"}`).join("\n");
    const text = await askClaude(
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

function ruleBasedPreScreening(answers: Record<string, string>): PreScreeningAnalysis {
  const parts: string[] = [];
  let score = 0; // 高いほどポジティブ
  let cautionFlags = 0;

  const animal = answers["q3"] ?? "";
  if (animal.includes("とても好き")) {
    score += 2;
    parts.push("動物への興味が非常に強い。");
  } else if (animal.includes("好き")) {
    score += 1;
    parts.push("動物への興味がある。");
  } else if (animal.includes("苦手")) {
    cautionFlags++;
    parts.push("動物にやや苦手意識があるため、体験時の様子を確認したい。");
  }

  const group = answers["q4"] ?? "";
  if (group === "できる") {
    score += 2;
    parts.push("集団生活にも適応できそう。");
  } else if (group.includes("たぶん")) {
    score += 1;
    parts.push("集団生活は概ね問題ないと思われる。");
  } else if (group.includes("不安")) {
    cautionFlags++;
    parts.push("集団生活に不安があるため初期サポート推奨。");
  }

  const dorm = answers["q5"] ?? "";
  if (dorm.includes("問題ない")) score += 2;
  else if (dorm.includes("少し不安")) {
    parts.push("寮生活に少し不安があるが、慣れれば問題ない見込み。");
  } else if (dorm.includes("大きい")) {
    cautionFlags++;
    parts.push("寮生活への不安が大きいため、見学時に寮の案内を丁寧に行うことを推奨。");
  }

  const guardian = answers["q7"] ?? "";
  if (guardian.includes("賛成")) score += 2;
  else if (guardian.includes("どちら")) {
    cautionFlags++;
    parts.push("保護者の意向確認が必要。");
  } else if (guardian.includes("反対")) {
    cautionFlags += 2;
    parts.push("保護者が反対しているため、保護者への丁寧な説明が必須。");
  }

  const futsuko = answers["q8"] ?? "";
  if (futsuko === "ある") {
    parts.push("不登校経験があるため、本人のペースに合わせた対応を推奨。");
  }

  const health = answers["q10"] ?? "";
  if (health.includes("配慮")) {
    cautionFlags++;
    parts.push("健康面で配慮が必要な点がある。");
  }
  if ((answers["q11"] ?? "").trim() && !/なし|ない|特に/.test(answers["q11"])) {
    parts.push(`アレルギー: ${answers["q11"]}。`);
  }
  if ((answers["q12"] ?? "").trim() && !/なし|ない|特に/.test(answers["q12"])) {
    cautionFlags++;
    parts.push("精神面の配慮事項あり。担当者は詳細を確認すること。");
  }

  const morning = answers["q6"] ?? "";
  if (morning === "苦手") parts.push("朝が苦手なため、生活リズムづくりのサポートがあると良い。");

  let type: string;
  if (score >= 5 && cautionFlags === 0) type = "明るく素直タイプ";
  else if (score >= 4) type = "前向き努力タイプ";
  else if (cautionFlags >= 2) type = "じっくりサポートタイプ";
  else if ((answers["q4"] ?? "").includes("不安") || (answers["q5"] ?? "").includes("不安"))
    type = "繊細・マイペースタイプ";
  else type = "コツコツ堅実タイプ";

  const dream = (answers["q2"] ?? "").trim();
  const head = dream ? `将来の夢は「${dream.slice(0, 30)}${dream.length > 30 ? "…" : ""}」。` : "";

  const judgement: AiJudgement = cautionFlags >= 3 ? "rejected" : cautionFlags >= 1 ? "caution" : "approved";

  return {
    type,
    summary: (head + " " + parts.join(" ")).trim() || "回答内容から特筆すべき懸念は見られない。",
    judgement,
  };
}

/* ============ ステップ4: 体験アンケートから入学確率 ============ */

export function computeEnrollmentProbability(
  studentAnswers: Record<string, string> | null,
  parentAnswers: Record<string, string> | null
): number {
  let p = 40;
  if (studentAnswers) {
    const s1 = studentAnswers["s1"] ?? "";
    if (s1.includes("とても")) p += 12;
    else if (s1.includes("楽しかった")) p += 7;
    else if (s1.includes("あまり")) p -= 15;
    const s2 = studentAnswers["s2"] ?? "";
    if (s2.includes("とても")) p += 8;
    else if (s2.includes("好きになった")) p += 5;
    const s3 = studentAnswers["s3"] ?? "";
    if (s3 === "できそう") p += 8;
    else if (s3.includes("不安")) p -= 8;
    const s4 = studentAnswers["s4"] ?? "";
    if (s4.includes("ぜひ")) p += 20;
    else if (s4 === "入学したい") p += 12;
    else if (s4.includes("迷って")) p -= 5;
    else if (s4.includes("考え中")) p -= 10;
  }
  if (parentAnswers) {
    const p1 = parentAnswers["p1"] ?? "";
    if (p1.includes("とても")) p += 10;
    else if (p1.includes("安心できた")) p += 6;
    else if (p1.includes("不安")) p -= 10;
    const p2 = parentAnswers["p2"] ?? "";
    if (p2.includes("共感")) p += 5;
    else if (p2.includes("疑問")) p -= 8;
    const p3 = parentAnswers["p3"] ?? "";
    if (p3.includes("良かった")) p += 4;
    const p4 = parentAnswers["p4"] ?? "";
    if (p4.includes("特にない")) p += 5;
    else if (p4.includes("大きく")) p -= 12;
  }
  return Math.max(3, Math.min(98, p));
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

  if (hasClaude()) {
    const text = await askClaude(
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

/* ============ リタッチ馬 月次要約 ============ */

export interface ReportForSummary {
  report_date: string;
  content: string;
  horse_condition: string | null;
  student_name?: string;
}

export async function summarizeHorseMonth(
  horseName: string,
  year: number,
  month: number,
  reports: ReportForSummary[]
): Promise<string> {
  if (hasClaude() && reports.length > 0) {
    const body = reports
      .map((r) => `${r.report_date} ${r.student_name ?? ""}: ${r.content}${r.horse_condition ? ` / 馬の状態: ${r.horse_condition}` : ""}`)
      .join("\n");
    const text = await askClaude(
      `あなたは馬の学校のリタッチ馬(引退馬支援)月次レポート作成AIです。${horseName}号の${year}年${month}月の騎乗報告をもとに、` +
        `一口支援者の皆さまへ向けた温かみのある月次報告文を日本語で200〜300字で書いてください。健康状態・活動内容・生徒との関わりを含めてください。\n\n${body}`
    );
    if (text) return text.trim();
  }

  if (reports.length === 0) {
    return `${year}年${month}月の${horseName}号は、騎乗記録はありませんでしたが、スタッフによる日々のケアのもと穏やかに過ごしています。引き続き温かく見守りいただけますと幸いです。`;
  }
  const conditions = reports.map((r) => r.horse_condition).filter(Boolean) as string[];
  const students = Array.from(new Set(reports.map((r) => r.student_name).filter(Boolean)));
  const lines = [
    `${year}年${month}月の${horseName}号のご報告です。`,
    `今月は${reports.length}回の騎乗・活動記録がありました。`,
  ];
  if (students.length > 0) {
    lines.push(`${students.slice(0, 3).join("さん、")}さんをはじめとする生徒たちが日々の手入れと騎乗を担当し、信頼関係を深めています。`);
  }
  if (conditions.length > 0) {
    lines.push(`馬の状態について:「${conditions[conditions.length - 1]}」と報告されています。`);
  }
  lines.push("支援者の皆さまの温かいご支援に、生徒・スタッフ一同心より感謝申し上げます。");
  return lines.join(" ");
}

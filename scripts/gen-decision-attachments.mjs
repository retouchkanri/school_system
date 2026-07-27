// docs/ の合否通知同封書類6点を Base64 で埋め込んだ src/lib/decision-attachments.ts を生成する。
// 元のファイルを更新したら: node scripts/gen-decision-attachments.mjs
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
// key は DECISION_DOCUMENTS (src/lib/constants.ts) の key と一致させること
const FILES = [
  { key: "result_letter", display: "合否通知書.txt", src: "docs/合否通知書.txt", var: "RESULT_LETTER_B64" },
  { key: "tuition_guide", display: "学費案内.txt", src: "docs/学費案内.txt", var: "TUITION_GUIDE_B64" },
  { key: "school_rules", display: "入学規約.txt", src: "docs/入学規約.txt", var: "SCHOOL_RULES_B64" },
  { key: "supplies_list", display: "学用品一覧.txt", src: "docs/学用品一覧.txt", var: "SUPPLIES_LIST_B64" },
  { key: "uniform_guide", display: "制服案内.txt", src: "docs/制服案内.txt", var: "UNIFORM_GUIDE_B64" },
  { key: "enrollment_flow", display: "入学までの流れ.txt", src: "docs/入学までの流れ.txt", var: "ENROLLMENT_FLOW_B64" },
];

function chunk(s, n) {
  const out = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out;
}

let out = `/**
 * 合否通知メールに添付する同封書類6点(合否通知書・学費案内・入学規約・学用品一覧・制服案内・入学までの流れ)。
 * ファイルの実体を Base64 で埋め込んでいるため、サーバーレス環境でも
 * ファイルシステム/URL に依存せず確実に添付できる。
 * docs/ 配下の元ファイルを更新したら scripts/gen-decision-attachments.mjs を再実行して再生成すること。
 */
import type { EmailAttachment } from "@/lib/notify";

`;

for (const f of FILES) {
  const b64 = readFileSync(path.join(root, f.src)).toString("base64");
  const lines = chunk(b64, 120).map((c) => `  "${c}" +`);
  lines[lines.length - 1] = lines[lines.length - 1].replace(/ \+$/, "");
  out += `const ${f.var} =\n${lines.join("\n")};\n\n`;
}

out += `const DECISION_ATTACHMENTS: Record<string, EmailAttachment> = {
${FILES.map((f) => `  ${f.key}: { filename: "${f.display}", content: Buffer.from(${f.var}, "base64") },`).join("\n")}
};

/** 指定した書類キー(DECISION_DOCUMENTSのkeyと一致)の同封書類を添付ファイルとして返す */
export function decisionAttachments(keys: string[]): EmailAttachment[] {
  return keys.map((k) => DECISION_ATTACHMENTS[k]).filter((a): a is EmailAttachment => !!a);
}
`;

writeFileSync(path.join(root, "src/lib/decision-attachments.ts"), out);
console.log("generated src/lib/decision-attachments.ts");

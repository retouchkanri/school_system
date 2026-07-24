// docs/ の2つのフォーム(Word文書)を Base64 で埋め込んだ src/lib/form-attachments.ts を生成する。
// 元の docx を更新したら: node scripts/gen-form-attachments.mjs
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const FILES = [
  { display: "入学仮審査(お試し)フォーム.docx", src: "docs/入学仮審査(お試し)フォーム.docx", var: "PRE_SCREENING_B64" },
  { display: "学校見学お申し込みフォーム.docx", src: "docs/学校見学お申し込みフォーム.docx", var: "SCHOOL_TOUR_B64" },
];

function chunk(s, n) {
  const out = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out;
}

let out = `/**
 * 資料請求メールに添付する2つのフォーム(Word文書)。
 * ファイルの実体を Base64 で埋め込んでいるため、サーバーレス環境でも
 * ファイルシステム/URL に依存せず確実に添付できる。
 * docs/ 配下の元ファイルを更新したら scripts/gen-form-attachments.mjs を再実行して再生成すること。
 */
import type { EmailAttachment } from "@/lib/notify";

`;

for (const f of FILES) {
  const b64 = readFileSync(path.join(root, f.src)).toString("base64");
  const lines = chunk(b64, 120).map((c) => `  "${c}" +`);
  lines[lines.length - 1] = lines[lines.length - 1].replace(/ \+$/, "");
  out += `const ${f.var} =\n${lines.join("\n")};\n\n`;
}

out += `/** 資料請求メールに添付する2フォームを返す (Base64埋め込みのため常に利用可能) */
export function formAttachments(): EmailAttachment[] {
  return [
${FILES.map((f) => `    { filename: "${f.display}", content: Buffer.from(${f.var}, "base64") },`).join("\n")}
  ];
}
`;

writeFileSync(path.join(root, "src/lib/form-attachments.ts"), out);
console.log("generated src/lib/form-attachments.ts");

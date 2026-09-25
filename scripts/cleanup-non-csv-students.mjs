/**
 * docs/生徒情報2026.csv に無い生徒レコードを削除する。
 *
 * 使い方:
 *   node scripts/cleanup-non-csv-students.mjs --dry-run
 *   node scripts/cleanup-non-csv-students.mjs
 *
 * 照合優先順:
 *   1. 本人メール (dorm_info の「本人メール:」または profiles.email)
 *   2. 正規化氏名 + 入学年月 + 区分 (class_name / enrollment_date)
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry-run");
const IMPORT_TAG = "[csv-2026]";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("✗ .env.local に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (q) {
      if (c === '"' && n === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        q = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      q = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && n === "\n") i++;
      row.push(cell);
      if (row.some((x) => String(x).trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function hankakuToZenkaku(str) {
  if (!str) return str;
  const map = {
    ｱ: "ア", ｲ: "イ", ｳ: "ウ", ｴ: "エ", ｵ: "オ",
    ｶ: "カ", ｷ: "キ", ｸ: "ク", ｹ: "ケ", ｺ: "コ",
    ｻ: "サ", ｼ: "シ", ｽ: "ス", ｾ: "セ", ｿ: "ソ",
    ﾀ: "タ", ﾁ: "チ", ﾂ: "ツ", ﾃ: "テ", ﾄ: "ト",
    ﾅ: "ナ", ﾆ: "ニ", ﾇ: "ヌ", ﾈ: "ネ", ﾉ: "ノ",
    ﾊ: "ハ", ﾋ: "ヒ", ﾌ: "フ", ﾍ: "ヘ", ﾎ: "ホ",
    ﾏ: "マ", ﾐ: "ミ", ﾑ: "ム", ﾒ: "メ", ﾓ: "モ",
    ﾔ: "ヤ", ﾕ: "ユ", ﾖ: "ヨ",
    ﾗ: "ラ", ﾘ: "リ", ﾙ: "ル", ﾚ: "レ", ﾛ: "ロ",
    ﾜ: "ワ", ｦ: "ヲ", ﾝ: "ン",
    ｧ: "ァ", ｨ: "ィ", ｩ: "ゥ", ｪ: "ェ", ｫ: "ォ",
    ｬ: "ャ", ｭ: "ュ", ｮ: "ョ", ｯ: "ッ",
    ｰ: "ー", "｡": "。", "､": "、", "･": "・", "｢": "「", "｣": "」",
  };
  const dakuten = {
    カ: "ガ", キ: "ギ", ク: "グ", ケ: "ゲ", コ: "ゴ",
    サ: "ザ", シ: "ジ", ス: "ズ", セ: "ゼ", ソ: "ゾ",
    タ: "ダ", チ: "ヂ", ツ: "ヅ", テ: "デ", ト: "ド",
    ハ: "バ", ヒ: "ビ", フ: "ブ", ヘ: "ベ", ホ: "ボ",
    ウ: "ヴ",
  };
  const handakuten = { ハ: "パ", ヒ: "ピ", フ: "プ", ヘ: "ペ", ホ: "ポ" };
  let out = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const base = map[ch] ?? ch;
    const next = str[i + 1];
    if (next === "ﾞ" || next === "゛") {
      out += dakuten[base] ?? base + "゛";
      i++;
    } else if (next === "ﾟ" || next === "゜") {
      out += handakuten[base] ?? base + "゜";
      i++;
    } else {
      out += base;
    }
  }
  return out;
}

function normalizeName(name) {
  return hankakuToZenkaku(String(name ?? "").replace(/\u3000/g, " ").replace(/\s+/g, " ").trim());
}

function col(row, idx, fallback = "") {
  return String(row[idx] ?? fallback).trim();
}

function identityKey(name, year, month, typeChar) {
  return `${normalizeName(name)}|${year}|${month}|${typeChar}`;
}

function loadCsvIdentities() {
  const buf = fs.readFileSync(path.join(ROOT, "docs", "生徒情報2026.csv"));
  let text = new TextDecoder("shift_jis").decode(buf);
  if (!text.includes("氏名") && !text.includes("氏")) {
    text = buf.toString("utf8");
  }
  const rows = parseCsv(text);
  const findCol = (...cands) => {
    for (const c of cands) {
      const i = rows[0].findIndex((h) => h.replace(/\s/g, "").includes(c.replace(/\s/g, "")));
      if (i >= 0) return i;
    }
    return -1;
  };

  const iName = findCol("氏名");
  const iType = findCol("区分");
  const iYear = findCol("入学年度");
  const iMonth = findCol("月");
  const iEmail = findCol("メールアドレス");
  if (iName < 0 || iType < 0 || iYear < 0) {
    throw new Error(`生徒CSVのヘッダが不正です: ${rows[0].join(",")}`);
  }

  const emails = new Set();
  const identities = new Set();
  const entries = [];

  for (const row of rows.slice(1)) {
    const name = normalizeName(col(row, iName));
    if (!name) continue;
    const type = col(row, iType);
    const year = Number(col(row, iYear));
    const month = Number(col(row, iMonth) || "4");
    const email = col(row, iEmail).toLowerCase();
    const isHigh = type.startsWith("高");
    const typeChar = isHigh ? "H" : "S";
    const className = isHigh
      ? `高等課程${year}年${month}月入学`
      : `専門課程${year}年${month}月入学`;
    const key = identityKey(name, year, month, typeChar);
    if (email) emails.add(email);
    identities.add(key);
    entries.push({ name, email, year, month, typeChar, className, key });
  }

  return { emails, identities, entries, csvCount: entries.length };
}

function extractEmailFromDorm(dormInfo) {
  const m = String(dormInfo ?? "").match(/本人メール:([^\s/]+)/i);
  return m ? m[1].toLowerCase() : null;
}

function inferTypeChar(student) {
  const num = String(student.student_number ?? "");
  const m = num.match(/^([HS])/i);
  if (m) return m[1].toUpperCase();
  const cls = String(student.class_name ?? "");
  if (cls.includes("高等")) return "H";
  if (cls.includes("専門")) return "S";
  return "?";
}

function inferYearMonth(student) {
  const cls = String(student.class_name ?? "");
  const cm = cls.match(/(\d{4})年(\d{1,2})月/);
  if (cm) return { year: Number(cm[1]), month: Number(cm[2]) };
  if (student.enrollment_date) {
    const d = String(student.enrollment_date);
    const em = d.match(/^(\d{4})-(\d{2})/);
    if (em) return { year: Number(em[1]), month: Number(em[2]) };
  }
  return { year: null, month: null };
}

async function fetchAllStudents() {
  const { data, error } = await db
    .from("students")
    .select(
      "id, student_number, name, class_name, enrollment_date, dorm_info, user_id, parent_user_id, lead_id, status",
    )
    .order("student_number");
  if (error) throw new Error(`students 取得失敗: ${error.message}`);
  return data ?? [];
}

async function fetchProfileEmails(ids) {
  const uniq = [...new Set(ids.filter(Boolean))];
  const map = new Map();
  for (let i = 0; i < uniq.length; i += 100) {
    const chunk = uniq.slice(i, i + 100);
    const { data, error } = await db.from("profiles").select("id, email, full_name, role").in("id", chunk);
    if (error) throw new Error(`profiles 取得失敗: ${error.message}`);
    for (const p of data ?? []) {
      map.set(p.id, p);
    }
  }
  return map;
}

function classifyStudent(s, csv, profileById) {
  const dormEmail = extractEmailFromDorm(s.dorm_info);
  const profile = s.user_id ? profileById.get(s.user_id) : null;
  const profileEmail = profile?.email?.toLowerCase() || null;

  if (dormEmail && csv.emails.has(dormEmail)) {
    return { keep: true, reason: `email(dorm):${dormEmail}` };
  }
  if (profileEmail && csv.emails.has(profileEmail)) {
    return { keep: true, reason: `email(profile):${profileEmail}` };
  }

  const typeChar = inferTypeChar(s);
  const { year, month } = inferYearMonth(s);
  if (year && month && typeChar !== "?") {
    const key = identityKey(s.name, year, month, typeChar);
    if (csv.identities.has(key)) {
      return { keep: true, reason: `identity:${key}` };
    }
  }

  // CSV インポートタグがあるが照合できなかった場合は削除対象 (誤マッチ防止で残さない)
  return {
    keep: false,
    reason: [
      dormEmail ? `dormEmail=${dormEmail}` : null,
      profileEmail ? `profileEmail=${profileEmail}` : null,
      year && month ? `ym=${year}-${month}` : null,
      `type=${typeChar}`,
      String(s.dorm_info ?? "").includes(IMPORT_TAG) ? "had-csv-tag" : "no-csv-tag",
    ]
      .filter(Boolean)
      .join(", "),
  };
}

/** student に紐づく依存行は ON DELETE CASCADE 想定。明示削除で安全側にも寄せる。 */
const DEPENDENT_TABLES = [
  "attendance_records",
  "training_records",
  "riding_reports",
  "overnight_leave_requests",
  "meal_records",
  "survey_answers",
  "grade_records",
  "absence_requests",
  "injury_records",
  "insurance_claims",
  "shared_photos",
  "reimbursements",
  "payments",
];

async function deleteStudentCascade(student) {
  for (const table of DEPENDENT_TABLES) {
    const { error } = await db.from(table).delete().eq("student_id", student.id);
    // テーブルが無い環境でも止めない
    if (error && !/does not exist|schema cache/i.test(error.message)) {
      throw new Error(`${table} 削除失敗 (${student.student_number}): ${error.message}`);
    }
  }

  const { error } = await db.from("students").delete().eq("id", student.id);
  if (error) throw new Error(`students 削除失敗 (${student.student_number}): ${error.message}`);

  // CSV タグ付き lead、または seed デモ lead を掃除 (他生徒に未使用なら)
  if (student.lead_id) {
    const { data: stillUsed } = await db
      .from("students")
      .select("id")
      .eq("lead_id", student.lead_id)
      .limit(1);
    if (!stillUsed?.length) {
      const { data: lead } = await db
        .from("leads")
        .select("id, name, remarks, email")
        .eq("id", student.lead_id)
        .maybeSingle();
      const remarks = String(lead?.remarks ?? "");
      const isCsvLead = remarks.includes(IMPORT_TAG);
      const demoNames = new Set(["鈴木 陸", "高橋 結衣", "山田 健太", "テスト1", "テスト1 テスト1", "バジガク中山"]);
      const isDemo =
        demoNames.has(normalizeName(lead?.name ?? "")) ||
        /example\.com|test|demo|shiryou@horsepark/i.test(String(lead?.email ?? ""));
      if (isCsvLead || isDemo) {
        // enrollment_procedures / payments(lead) は lead cascade がある想定
        await db.from("enrollment_procedures").delete().eq("lead_id", student.lead_id);
        await db.from("payments").delete().eq("lead_id", student.lead_id).is("student_id", null);
        await db.from("leads").delete().eq("id", student.lead_id);
      }
    }
  }
}

async function main() {
  console.log(`🧹 CSV外生徒クリーンアップ${DRY ? " (dry-run)" : ""}`);

  const csv = loadCsvIdentities();
  console.log(`   CSV データ行: ${csv.csvCount}`);
  console.log(`   CSV 本人メール: ${csv.emails.size}`);

  const students = await fetchAllStudents();
  console.log(`   DB 生徒数: ${students.length}`);

  const profileIds = students.flatMap((s) => [s.user_id, s.parent_user_id]);
  const profileById = await fetchProfileEmails(profileIds);

  const keep = [];
  const remove = [];
  for (const s of students) {
    const result = classifyStudent(s, csv, profileById);
    const row = {
      id: s.id,
      number: s.student_number,
      name: s.name,
      class_name: s.class_name,
      lead_id: s.lead_id,
      user_id: s.user_id,
      parent_user_id: s.parent_user_id,
      match: result.reason,
    };
    if (result.keep) keep.push(row);
    else remove.push({ ...row, student: s });
  }

  console.log("\n── 残す生徒");
  for (const r of keep) {
    console.log(`   ✓ ${r.number} ${r.name}  [${r.match}]`);
  }
  console.log(`   計 ${keep.length}`);

  console.log("\n── 削除対象");
  for (const r of remove) {
    console.log(`   ✗ ${r.number} ${r.name}  (${r.class_name ?? "-"})  [${r.match}]`);
  }
  console.log(`   計 ${remove.length}`);

  if (DRY) {
    console.log("\n(dry-run) 削除は実行していません。");
    return;
  }

  let deleted = 0;
  for (const r of remove) {
    await deleteStudentCascade(r.student);
    deleted++;
    console.log(`   deleted ${r.number} ${r.name}`);
  }

  const { count, error } = await db
    .from("students")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(`残件数確認失敗: ${error.message}`);

  console.log(`\n✓ 削除 ${deleted} / 残存 ${count} (CSV ${csv.csvCount})`);
  if (count !== csv.csvCount) {
    console.log("⚠ 残存数が CSV 行数と一致しません。重複行や照合漏れの可能性があります。");
  }
}

main().catch((e) => {
  console.error("✗", e.message || e);
  process.exit(1);
});

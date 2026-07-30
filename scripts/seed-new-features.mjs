/**
 * 追加機能 (馬台帳 / 騎乗評価 / 怪我・保険 / 学費) のテストデータ投入スクリプト
 *
 * 前提:
 *   1. supabase/schema.sql の「追加機能」ブロック (913行目〜末尾) を Supabase SQL Editor で
 *      実行済みであること。特に `alter type payment_type add value if not exists 'tuition';`
 *      は PostgreSQL の仕様上、追加したのと同じトランザクション内では値を使えないため、
 *      「SQLを実行 → その後にこのスクリプト」の順番が必須。
 *   2. `npm run setup` で基本のデモデータ (馬・生徒) が入っていること。
 *      このスクリプトは既存の馬・生徒を探して、それに紐づく追加データだけを入れる。
 *
 * 使い方:
 *   node scripts/seed-new-features.mjs            投入 (既に入っていればスキップ)
 *   node scripts/seed-new-features.mjs --reset    このスクリプトが入れた行だけ削除して再投入
 *   node scripts/seed-new-features.mjs --dry-run  何を入れるかだけ表示して終了
 *
 * 安全性:
 *   - 既存データは削除しない。--reset でもこのスクリプトが付けた目印
 *     (SEED_TAG "[demo-seed]") が付いた行だけを削除する。
 *   - 各セクションは投入前に「同じ行が既にあるか」を照合し、あればスキップする (冪等)。
 *
 * 写真共有 (shared_photos) は投入しない:
 *   files 列に入れるパスは Supabase Storage の実ファイルと対応している必要があり、
 *   DBだけに行を入れても署名付きURLの発行に失敗して画像が表示されないため。
 *   → /admin/photos の画面からアップロードして動作確認すること (最後に案内を出す)。
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("✗ .env.local に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const RESET = process.argv.includes("--reset");
const DRY = process.argv.includes("--dry-run");

/** このスクリプトが投入した行の目印 (notes / memo / description の末尾に付ける) */
const SEED_TAG = "[demo-seed]";
const tag = (text) => `${text} ${SEED_TAG}`;

/* ---------- 日付ユーティリティ (JST基準の YYYY-MM-DD) ---------- */
const dateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const daysAhead = (n) => daysAgo(-n);
const D = (n) => dateStr(daysAgo(n));
const DA = (n) => dateStr(daysAhead(n));

/* ---------- 出力ヘルパー ---------- */
let created = 0;
let skipped = 0;
const step = (msg) => console.log(`\n── ${msg}`);
const okLine = (msg) => console.log(`   ✓ ${msg}`);
const skipLine = (msg) => console.log(`   · ${msg} (既存のためスキップ)`);
const warnLine = (msg) => console.log(`   ! ${msg}`);

/**
 * 冪等な投入。keyCols で既存行を照合し、無いものだけ insert する。
 * @param {string} table
 * @param {string[]} keyCols 同一性の判定に使う列
 * @param {object[]} rows
 */
async function seed(table, keyCols, rows) {
  if (rows.length === 0) return [];
  if (DRY) {
    okLine(`${table}: ${rows.length}件 (dry-run)`);
    return [];
  }
  const inserted = [];
  for (const row of rows) {
    let q = db.from(table).select("id");
    for (const col of keyCols) {
      q = row[col] === null || row[col] === undefined ? q.is(col, null) : q.eq(col, row[col]);
    }
    const { data: existing, error: selErr } = await q.limit(1);
    if (selErr) throw new Error(`${table} の照合に失敗: ${selErr.message}`);
    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }
    const { data, error } = await db.from(table).insert(row).select().single();
    if (error) throw new Error(`${table} への投入に失敗: ${error.message}`);
    inserted.push(data);
    created++;
  }
  const n = inserted.length;
  if (n > 0) okLine(`${table}: ${n}件を追加`);
  else skipLine(`${table}`);
  return inserted;
}

/** SEED_TAG が付いた行だけ削除する (--reset) */
async function resetTagged() {
  step("--reset: このスクリプトが投入した行を削除します (既存データには触れません)");
  const targets = [
    ["insurance_claims", "incident_summary"],
    ["injury_records", "description"],
    ["horse_movements", "notes"],
    ["horse_vaccinations", "notes"],
    ["horse_farrier_records", "notes"],
    ["riding_reports", "content"],
    ["payments", "memo"],
  ];
  for (const [table, col] of targets) {
    const { error } = await db.from(table).delete().like(col, `%${SEED_TAG}%`);
    if (error) throw new Error(`${table} の削除に失敗: ${error.message}`);
    okLine(`${table}: ${SEED_TAG} 付きの行を削除`);
  }
}

/** 追加機能のスキーマが適用済みかを確認する */
async function preflight() {
  step("スキーマ適用チェック");
  const checks = [
    ["horse_movements", () => db.from("horse_movements").select("id").limit(1)],
    ["horse_vaccinations", () => db.from("horse_vaccinations").select("id").limit(1)],
    ["horse_farrier_records", () => db.from("horse_farrier_records").select("id").limit(1)],
    ["injury_records", () => db.from("injury_records").select("id").limit(1)],
    ["insurance_claims", () => db.from("insurance_claims").select("id").limit(1)],
    ["shared_photos", () => db.from("shared_photos").select("id").limit(1)],
    ["horses.active 列", () => db.from("horses").select("id, active").limit(1)],
    ["riding_reports.fell_off 列", () => db.from("riding_reports").select("id, fell_off, rideability").limit(1)],
    ["payments.due_date 列", () => db.from("payments").select("id, due_date, installment_label, memo").limit(1)],
  ];
  const missing = [];
  for (const [label, run] of checks) {
    const { error } = await run();
    if (error) missing.push(`${label}: ${error.message}`);
  }
  if (missing.length > 0) {
    console.error("\n✗ 追加機能のスキーマが未適用です。以下が見つかりませんでした:");
    for (const m of missing) console.error(`   - ${m}`);
    console.error("\n  → Supabase ダッシュボード → SQL Editor で supabase/schema.sql の");
    console.error("     『追加機能 (馬台帳 / 騎乗評価 / 怪我・保険 / 写真共有 / 学費)』ブロック");
    console.error("     (913行目〜末尾) を貼り付けて Run したあと、もう一度実行してください。");
    process.exit(1);
  }
  okLine("追加テーブル・追加列は適用済み");
}

async function main() {
  console.log("🐴 追加機能のテストデータ投入");
  if (DRY) console.log("   (--dry-run: DBには書き込みません)");

  await preflight();
  if (RESET && !DRY) await resetTagged();

  /* ============ 参照データの取得 ============ */
  step("既存の馬・生徒を読み込み");
  const { data: horsesData } = await db.from("horses").select("*").order("created_at");
  const horses = horsesData ?? [];
  const { data: studentsData } = await db
    .from("students")
    .select("*")
    .eq("status", "enrolled")
    .order("student_number");
  const students = studentsData ?? [];

  if (horses.length === 0 || students.length === 0) {
    console.error("\n✗ 馬または在籍生徒が1件もありません。先に `npm run setup` を実行してください。");
    process.exit(1);
  }
  okLine(`馬 ${horses.length}頭 / 在籍生徒 ${students.length}名`);

  const byName = (n) => horses.find((h) => h.name === n);
  // setup.mjs の馬が無い環境でも動くよう、見つからなければ先頭から順に割り当てる
  const h1 = byName("サクラウィンド") ?? horses[0];
  const h2 = byName("ハヤテマル") ?? horses[1] ?? horses[0];
  const retouch = horses.filter((h) => h.is_retouch);
  const r1 = retouch[0] ?? byName("シルバーレイン") ?? horses[0];
  const r2 = retouch[1] ?? byName("ゴールドスター") ?? r1;

  const s1 = students[0];
  const s2 = students[1] ?? students[0];
  const s3 = students[2] ?? s2;

  const { data: adminProfile } = await db
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  const adminId = adminProfile?.id ?? null;

  /* ============ 1. 馬の基本情報 (追加列) ============ */
  step("1. 馬の台帳情報 (性別・毛色・保険など) を補完");
  if (!DRY) {
    const horseDetails = [
      [h1, { sex: "牝", color: "鹿毛", birth_date: "2018-04-12", microchip: "392140000123456", owner: "学校法人 東関東馬事学院", arrived_on: D(900), active: true, insurance_company: "○○損害保険", insurance_expires_on: DA(120) }],
      [h2, { sex: "牡", color: "青鹿毛", birth_date: "2020-03-05", microchip: "392140000123457", owner: "△△牧場", arrived_on: D(400), active: true, insurance_company: "○○損害保険", insurance_expires_on: DA(25) }],
      [r1, { sex: "騸", color: "栗毛", birth_date: "2011-05-20", microchip: "392140000123458", owner: "学校法人 東関東馬事学院", arrived_on: D(1500), active: true, insurance_company: "□□共済", insurance_expires_on: DA(200) }],
      [r2, { sex: "牡", color: "芦毛", birth_date: "2009-02-28", owner: "学校法人 東関東馬事学院", arrived_on: D(2000), active: true }],
    ];
    for (const [horse, patch] of horseDetails) {
      if (!horse) continue;
      // 既に埋まっていれば上書きしない (職員が入力した内容を壊さないため)
      if (horse.sex || horse.color) {
        skipped++;
        continue;
      }
      const { error } = await db.from("horses").update(patch).eq("id", horse.id);
      if (error) throw new Error(`horses の更新に失敗: ${error.message}`);
      created++;
      okLine(`${horse.name}: 台帳情報を設定`);
    }

    // 退厩済みの馬 (絞り込み「退厩」の確認用)。専用のデモ馬を1頭だけ作る。
    const { data: retiredExisting } = await db.from("horses").select("id").eq("name", "ナツノユメ").limit(1);
    if (!retiredExisting || retiredExisting.length === 0) {
      const { error } = await db.from("horses").insert({
        name: "ナツノユメ",
        breed: "サラブレッド",
        age: 19,
        stall: "D-1",
        is_retouch: false,
        notes: tag("退厩済み。表示確認用のデモデータ。"),
        sex: "牝",
        color: "黒鹿毛",
        birth_date: "2007-04-01",
        owner: "○○牧場",
        arrived_on: D(2500),
        departed_on: D(30),
        active: false,
      });
      if (error) throw new Error(`horses への投入に失敗: ${error.message}`);
      created++;
      okLine("ナツノユメ (退厩済み) を追加");
    } else {
      skipLine("退厩済みのデモ馬");
    }
  } else {
    okLine("馬の台帳情報 4頭 + 退厩済み1頭 (dry-run)");
  }

  /* ============ 2. 入退記録 ============ */
  step("2. 入退記録 (horse_movements)");
  await seed("horse_movements", ["horse_id", "kind", "date"], [
    { horse_id: h1.id, kind: "arrival", date: D(900), counterpart: "△△牧場", reason: "実習馬として導入", notes: tag("入厩時の記録。"), created_by: adminId },
    { horse_id: h1.id, kind: "transfer", date: D(120), counterpart: "◇◇牧場", reason: "放牧", notes: tag("2週間の短期放牧。"), created_by: adminId },
    { horse_id: h2.id, kind: "arrival", date: D(400), counterpart: "△△牧場", reason: "育成馬として受入", notes: tag(""), created_by: adminId },
    { horse_id: r1.id, kind: "arrival", date: D(1500), counterpart: "競走馬時代の厩舎", reason: "引退後の受入 (リタッチ)", notes: tag(""), created_by: adminId },
  ]);

  /* ============ 3. 予防接種歴 (期限アラートの3パターン) ============ */
  step("3. 予防接種歴 (horse_vaccinations)");
  await seed("horse_vaccinations", ["horse_id", "vaccine_name", "date"], [
    // (a) 期限超過 → 琥珀色の警告
    { horse_id: h1.id, vaccine_name: "インフルエンザ", date: D(200), next_due_date: D(10), veterinarian: "○○動物病院 山本獣医師", lot_number: "LOT-2311", notes: tag("期限超過の表示確認用。"), created_by: adminId },
    // (b) まもなく期限 → 「あと20日」
    { horse_id: h2.id, vaccine_name: "インフルエンザ", date: D(160), next_due_date: DA(20), veterinarian: "○○動物病院 山本獣医師", notes: tag("期限間近の表示確認用。"), created_by: adminId },
    // (c) 余裕あり → 通常表示
    { horse_id: r1.id, vaccine_name: "破傷風", date: D(90), next_due_date: DA(180), veterinarian: "○○動物病院 山本獣医師", notes: tag(""), created_by: adminId },
    { horse_id: h1.id, vaccine_name: "破傷風", date: D(365), next_due_date: DA(365), veterinarian: "○○動物病院 山本獣医師", notes: tag(""), created_by: adminId },
  ]);

  /* ============ 4. 装蹄歴 ============ */
  step("4. 装蹄歴 (horse_farrier_records)");
  await seed("horse_farrier_records", ["horse_id", "date", "kind"], [
    { horse_id: h1.id, date: D(30), kind: "全装", farrier: "佐々木装蹄師", next_due_date: DA(12), notes: tag(""), created_by: adminId },
    { horse_id: h2.id, date: D(40), kind: "削蹄", farrier: "佐々木装蹄師", next_due_date: DA(5), notes: tag("装蹄アラートの表示確認用。"), created_by: adminId },
    { horse_id: r1.id, date: D(20), kind: "部分装蹄", farrier: "佐々木装蹄師", next_due_date: null, notes: tag("次回予定なしの表示確認用。"), created_by: adminId },
  ]);

  /* ============ 5. 評価項目入りの騎乗報告 ============ */
  step("5. 騎乗報告 (落馬・乗りやすさ・馬の様子・ヒヤリハット)");
  const ridingRows = [
    // --- リタッチ馬 r1: 今月分 (レポート生成の材料になる) ---
    { student_id: s1.id, horse_id: r1.id, report_date: D(3), lesson: "2限 馬場", content: tag("最初は緊張していたけど、後半は素直に前に出てくれた。"), horse_condition: "良好", rideability: 4, horse_mood: "落ち着いていた", fell_off: false, incident: null },
    { student_id: s2.id, horse_id: r1.id, report_date: D(6), lesson: "3限 馬場", content: tag("駈歩の発進が少し重かったが、指示にはよく応えてくれた。"), horse_condition: "良好", rideability: 3, horse_mood: "やや興奮", fell_off: false, incident: null },
    { student_id: s3.id, horse_id: r1.id, report_date: D(9), lesson: "2限 馬場", content: tag("手入れの時間がいちばん穏やかで、顔を寄せてくれた。"), horse_condition: null, rideability: null, horse_mood: "落ち着いていた", fell_off: false, incident: null },
    { student_id: s1.id, horse_id: r1.id, report_date: D(12), lesson: "4限 外乗", content: tag("外の音に反応して少し早足になったが、すぐに落ち着いた。"), horse_condition: "右前脚に軽い張り", rideability: 2, horse_mood: "興奮していた", fell_off: false, incident: tag("馬場の隅で急に止まり、バランスを崩しかけた。") },
    { student_id: s2.id, horse_id: r1.id, report_date: D(15), lesson: "2限 馬場", content: tag("速歩の維持ができるようになってきた。"), horse_condition: "良好", rideability: 5, horse_mood: "落ち着いていた", fell_off: false, incident: null },
    // --- リタッチ馬 r1: 先月分 (「先月」材料表示の確認用) ---
    { student_id: s1.id, horse_id: r1.id, report_date: D(40), lesson: "2限 馬場", content: tag("先月はまだ発進の合図が伝わりにくかった。"), horse_condition: "良好", rideability: 3, horse_mood: "やや興奮", fell_off: false, incident: null },
    { student_id: s3.id, horse_id: r1.id, report_date: D(45), lesson: "3限 馬場", content: tag("蹄の手入れを嫌がらずに待っていてくれた。"), horse_condition: null, rideability: 4, horse_mood: "落ち着いていた", fell_off: false, incident: null },
    // --- リタッチ馬 r2 ---
    { student_id: s2.id, horse_id: r2.id, report_date: D(5), lesson: "1限 馬場", content: tag("高齢だけれど歩様はしっかりしていた。"), horse_condition: "良好", rideability: 5, horse_mood: "落ち着いていた", fell_off: false, incident: null },
    { student_id: s3.id, horse_id: r2.id, report_date: D(18), lesson: "1限 馬場", content: tag("ゆっくり常歩で30分。息が上がる様子はなかった。"), horse_condition: null, rideability: 4, horse_mood: "落ち着いていた", fell_off: false, incident: null },
    // --- 一般馬: 落馬あり (一覧の赤帯・落馬集計の確認用) ---
    { student_id: s1.id, horse_id: h2.id, report_date: D(35), lesson: "4限 障害", content: tag("障害の手前で急停止し、そのまま前に落ちてしまった。"), horse_condition: "興奮気味", rideability: 1, horse_mood: "興奮していた", fell_off: true, incident: tag("物見をして横に飛び、落馬。すぐに立ち上がり外傷なし。") },
    { student_id: s2.id, horse_id: h2.id, report_date: D(28), lesson: "2限 馬場", content: tag("前回の反省を踏まえて、常歩から丁寧に。"), horse_condition: "良好", rideability: 3, horse_mood: "やや興奮", fell_off: false, incident: null },
    { student_id: s1.id, horse_id: h1.id, report_date: D(2), lesson: "3限 馬場", content: tag("扶助にとても素直。初心者にも勧められる。"), horse_condition: "良好", rideability: 5, horse_mood: "落ち着いていた", fell_off: false, incident: null },
    { student_id: s3.id, horse_id: h1.id, report_date: D(8), lesson: "2限 馬場", content: tag("輪乗りの内方姿勢を意識して練習した。"), horse_condition: "良好", rideability: 4, horse_mood: "落ち着いていた", fell_off: false, incident: null },
  ].map((r) => ({ ...r, reported_by: adminId }));
  await seed("riding_reports", ["student_id", "horse_id", "report_date", "content"], ridingRows);

  // 既存 (setup.mjs 投入分) の騎乗報告にも評価値を入れて、集計が空にならないようにする
  if (!DRY) {
    const { data: plainReports } = await db
      .from("riding_reports")
      .select("id")
      .is("rideability", null)
      .not("content", "like", `%${SEED_TAG}%`)
      .limit(12);
    const scores = [5, 4, 3, 4, 5, 2, 3, 4, 5, 3, 4, 2];
    const moods = ["落ち着いていた", "やや興奮", "落ち着いていた", "興奮していた"];
    let i = 0;
    for (const row of plainReports ?? []) {
      await db
        .from("riding_reports")
        .update({ rideability: scores[i % scores.length], horse_mood: moods[i % moods.length] })
        .eq("id", row.id);
      i++;
    }
    if (i > 0) okLine(`既存の騎乗報告 ${i}件に乗りやすさ・馬の様子を補完`);
  }

  /* ============ 6. 怪我記録 ============ */
  step("6. 怪我記録 (injury_records)");
  const injuries = await seed("injury_records", ["student_id", "date", "body_part"], [
    {
      student_id: s1.id, date: D(48), occurred_at: "騎乗中", horse_id: h2.id, body_part: "左手首", severity: "通院",
      description: tag("常歩から速歩へ移行する際にバランスを崩して落馬。左手首を強打し腫れあり。"),
      treatment: "患部を冷却し包帯で固定。保護者へ連絡のうえ受診。",
      hospital: "○○整形外科", doctor_note: "左橈骨遠位端の打撲。全治2週間。", recorded_by: adminId,
    },
    {
      student_id: s2.id, date: D(27), occurred_at: "厩舎作業中", horse_id: null, body_part: "右膝", severity: "軽傷",
      description: tag("馬房の敷料交換中に転倒し右膝を擦りむいた。(軽傷は通知が飛ばないことの確認用)"),
      treatment: "洗浄し絆創膏。経過観察。", hospital: null, doctor_note: null, recorded_by: adminId,
    },
    {
      student_id: s3.id, date: D(71), occurred_at: "騎乗中", horse_id: h2.id, body_part: "鎖骨", severity: "入院",
      description: tag("駈歩中に落馬し右肩から落下。鎖骨骨折の疑いで救急搬送。"),
      treatment: "その場で安静を保ち救急要請。", hospital: "○○総合病院", doctor_note: "右鎖骨骨折。手術後3日入院、全治8週間。", recorded_by: adminId,
    },
  ]);

  /* ============ 7. 保険申請 (状態を散らす) ============ */
  step("7. 保険申請 (insurance_claims)");
  // 既存の怪我記録 (再実行時) も拾えるよう、student_id + date で引き直す
  const findInjury = async (studentId, date) => {
    const { data } = await db
      .from("injury_records")
      .select("id")
      .eq("student_id", studentId)
      .eq("date", date)
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  };
  const inj1 = injuries.find((r) => r.student_id === s1.id)?.id ?? (await findInjury(s1.id, D(48)));
  const inj3 = injuries.find((r) => r.student_id === s3.id)?.id ?? (await findInjury(s3.id, D(71)));

  const claimRows = [];
  if (inj1) {
    claimRows.push({
      injury_record_id: inj1, student_id: s1.id, claimant_role: "student",
      submitted_by: s1.user_id ?? null, status: "submitted",
      insurance_company: "○○損害保険", claim_amount: 15000,
      incident_summary: tag("騎乗中の落馬により左手首を負傷。通院3回分の治療費を請求予定。"),
      documents: [],
    });
    claimRows.push({
      injury_record_id: inj1, student_id: s1.id, claimant_role: "parent",
      submitted_by: s1.parent_user_id ?? null, status: "reviewing",
      insurance_company: "○○損害保険", claim_amount: 42000,
      incident_summary: tag("同じ怪我について、保護者からの追加請求 (診断書取得費を含む)。"),
      staff_comment: "診断書の写しをお預かりしました。保険会社へ確認中です。",
      handled_by: adminId, handled_at: new Date().toISOString(),
      documents: [],
    });
  }
  if (inj3) {
    claimRows.push({
      injury_record_id: inj3, student_id: s3.id, claimant_role: "parent",
      submitted_by: s3.parent_user_id ?? null, status: "approved",
      insurance_company: "□□共済", claim_amount: 180000,
      incident_summary: tag("駈歩中の落馬による鎖骨骨折。入院・手術費用を請求。"),
      staff_comment: "保険会社より支給決定の連絡がありました。近日中にお振り込みされます。",
      handled_by: adminId, handled_at: new Date().toISOString(),
      documents: [],
    });
  }
  await seed("insurance_claims", ["student_id", "incident_summary"], claimRows);

  /* ============ 8. 学費 (納付済 / 未納 / 期限超過) ============ */
  step("8. 学費の請求 (payments type='tuition')");
  const year = new Date().getFullYear();
  const tuitionRows = [];
  for (const s of students) {
    // 前期: 期限を過去日にして「期限超過」を作る (催促通知ボタンの確認用)
    tuitionRows.push({
      student_id: s.id, type: "tuition", amount: 300000, method: "bank_transfer",
      status: "pending", due_date: D(20),
      installment_label: `${year}年度 前期`, memo: tag("期限超過の表示確認用。"),
    });
    // 後期: 未納 (期限はまだ先)
    tuitionRows.push({
      student_id: s.id, type: "tuition", amount: 300000, method: "bank_transfer",
      status: "pending", due_date: DA(45),
      installment_label: `${year}年度 後期`, memo: tag("未納の表示確認用。"),
    });
  }
  // 1人目だけ「施設費」を納付済みにする
  tuitionRows.push({
    student_id: s1.id, type: "tuition", amount: 120000, method: "bank_transfer",
    status: "confirmed", due_date: D(60), paid_at: new Date(daysAgo(58)).toISOString(),
    confirmed_by: adminId,
    installment_label: `${year}年度 施設費`, memo: tag("納付済みの表示確認用。"),
  });

  try {
    await seed("payments", ["student_id", "type", "installment_label"], tuitionRows);
  } catch (e) {
    if (String(e.message).includes("invalid input value for enum payment_type")) {
      console.error("\n✗ payment_type に 'tuition' が登録されていません。");
      console.error("  Supabase SQL Editor で次を実行してから、もう一度このスクリプトを実行してください:");
      console.error("    alter type payment_type add value if not exists 'tuition';");
      console.error("  (PostgreSQL の仕様上、enum値の追加と使用は別トランザクションである必要があります)");
      process.exit(1);
    }
    throw e;
  }

  /* ============ 9. リタッチ馬の先月レポート (編集・再通知の確認用) ============ */
  step("9. リタッチ馬の月次レポート (horse_monthly_summaries)");
  if (DRY) okLine("先月分の共有済みレポート 1件 (dry-run)");
  if (!DRY && r1) {
    const last = new Date();
    last.setMonth(last.getMonth() - 1);
    const { data: existing } = await db
      .from("horse_monthly_summaries")
      .select("id")
      .eq("horse_id", r1.id)
      .eq("year", last.getFullYear())
      .eq("month", last.getMonth() + 1)
      .limit(1);
    if (!existing || existing.length === 0) {
      const { error } = await db.from("horse_monthly_summaries").insert({
        horse_id: r1.id,
        year: last.getFullYear(),
        month: last.getMonth() + 1,
        summary: `${last.getFullYear()}年${last.getMonth() + 1}月の${r1.name}号のご報告です。今月は2回の騎乗・活動記録があり、2名の生徒たちが日々の手入れと騎乗を担当しました。落ち着いた表情を見せてくれる日が多く、生徒たちも安心して稽古に取り組めました。支援者の皆さまの温かいご支援に、生徒・スタッフ一同心より感謝申し上げます。`,
        report_count: 2,
        shared: true,
      });
      if (error) throw new Error(`horse_monthly_summaries への投入に失敗: ${error.message}`);
      created++;
      okLine("先月分の共有済みレポートを追加 (編集・再通知の確認用)");
    } else {
      skipLine("先月分のレポート");
    }
  }

  /* ============ 完了 ============ */
  console.log(`\n✓ 完了: ${created}件を追加、${skipped}件はスキップ (既存)\n`);
  console.log("── 写真共有 (/admin/photos) について ─────────────────────");
  console.log("  写真共有だけはこのスクリプトで投入していません。");
  console.log("  shared_photos.files には Storage 上の実ファイルのパスを入れる必要があり、");
  console.log("  DBに行だけを入れても署名付きURLの発行に失敗して画像が表示されないためです。");
  console.log("  次の手順で画面から確認してください:");
  console.log("   1. /admin/photos を開く");
  console.log("   2. 送り先=特定の生徒 / 公開先=本人・保護者 で画像を2〜3枚アップロード");
  console.log("      → その生徒で /student/photos、保護者で /parent/photos に表示されること");
  console.log("   3. 送り先=全員に公開 / 公開先=本人のみ で1件アップロード");
  console.log("      → 生徒側には出るが保護者側には出ないこと (絞り込みの確認)");
  console.log("");
  console.log("── 確認できる画面 ───────────────────────────────────────");
  console.log("  /admin/horses            馬一覧 (検索・絞り込み・期限警告)");
  console.log("  /admin/horses/[id]       馬詳細 (騎乗評価サマリ・入退/予防接種/装蹄)");
  console.log("  /admin/riding-reports    騎乗報告 (落馬・乗りやすさ列)");
  console.log("  /admin/injuries          怪我記録と保険申請の受付処理");
  console.log("  /admin/tuition           学費 (納付済/未納/期限超過・催促通知)");
  console.log("  /admin/retouch           リタッチ馬レポート生成 (AI) と編集");
  console.log("  /student/insurance /student/tuition /student/photos");
  console.log("  /parent/insurance  /parent/tuition  /parent/photos");
  console.log("");
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});

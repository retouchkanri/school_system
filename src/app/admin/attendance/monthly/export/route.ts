import { requireRole } from "@/lib/auth";
import { STATUS_CHARS, STATUS_ORDER, fetchMonthlyAttendance, parseMonth } from "../data";

/** Excelでの文字化けを防ぐためのUTF-8 BOM */
const BOM = "﻿";

/** CSVの1セルをエスケープ (カンマ・引用符・改行を含む場合はダブルクォートで囲む) */
function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 月間出欠表のCSVダウンロード (管理者専用) */
export async function GET(req: Request) {
  await requireRole("admin");

  const month = parseMonth(new URL(req.url).searchParams.get("month") ?? undefined);
  const { days, rows } = await fetchMonthlyAttendance(month);
  const dayList = Array.from({ length: days }, (_, i) => i + 1);

  const lines: string[] = [];
  lines.push(
    ["学籍番号", "氏名", "クラス", ...dayList.map((d) => `${d}日`), "出席", "欠席", "遅刻", "早退"]
      .map(csvCell)
      .join(",")
  );

  for (const row of rows) {
    lines.push(
      [
        row.student.student_number,
        row.student.name,
        row.student.class_name ?? "",
        ...dayList.map((d) => {
          const rec = row.byDay.get(d);
          return rec ? STATUS_CHARS[rec.status] : "";
        }),
        ...STATUS_ORDER.map((s) => row.counts[s]),
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const csv = BOM + lines.join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

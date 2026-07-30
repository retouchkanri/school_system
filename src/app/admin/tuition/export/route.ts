import { requireRole } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { fetchTuition, parseFilters, TUITION_STATE_LABELS } from "../data";

/** Excelでの文字化けを防ぐためのUTF-8 BOM */
const BOM = "﻿";

/** CSVの1セルをエスケープ (カンマ・引用符・改行を含む場合はダブルクォートで囲む) */
function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 学費の納付状況CSVダウンロード (管理者専用) */
export async function GET(req: Request) {
  await requireRole("admin");

  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const filters = parseFilters(sp);
  const { rows, today } = await fetchTuition(filters);

  const lines: string[] = [];
  lines.push(
    ["学籍番号", "氏名", "クラス", "名目", "金額", "納付期限", "状態", "納付日"].map(csvCell).join(",")
  );

  for (const { payment, student, state } of rows) {
    lines.push(
      [
        student?.student_number ?? "",
        student?.name ?? "",
        student?.class_name ?? "",
        payment.installment_label ?? "学費",
        payment.amount,
        payment.due_date ? fmtDate(payment.due_date) : "",
        TUITION_STATE_LABELS[state],
        payment.paid_at ? fmtDate(payment.paid_at) : "",
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const csv = BOM + lines.join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tuition-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

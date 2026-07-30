"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Badge, Field, Td, inputCls, btnPrimary, btnSmall } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { RIDEABILITY_LABELS } from "@/lib/constants";
import { updateRidingReport, deleteRidingReport, type ActionState } from "./actions";
import type { StudentOption, HorseOption } from "./report-form";
import EvalFields from "./eval-fields";

/** テーブル行に収まる赤系の小ボタン (btnSmall と同じ寸法・危険操作用) */
const btnSmallDanger =
  "inline-flex items-center justify-center gap-1 border border-red-600 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 transition duration-300 ease-out hover:bg-red-600 hover:text-white disabled:opacity-50";

export interface ReportRowData {
  id: string;
  report_date: string;
  student_id: string;
  student_name: string | null;
  horse_id: string;
  horse_name: string | null;
  horse_is_retouch: boolean;
  lesson: string | null;
  content: string;
  horse_condition: string | null;
  fell_off: boolean;
  rideability: number | null;
  horse_mood: string | null;
  incident: string | null;
}

/** 騎乗報告一覧の1行 (編集はインライン展開・削除は confirm 付き) */
export default function ReportRow({
  report,
  students,
  horses,
}: {
  report: ReportRowData;
  students: StudentOption[];
  horses: HorseOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updating] = useActionState<ActionState, FormData>(updateRidingReport, {});
  const [deleteState, deleteAction, deleting] = useActionState<ActionState, FormData>(deleteRidingReport, {});

  // 更新に成功したら編集欄を閉じる
  useEffect(() => {
    if (updateState.ok) setEditing(false);
  }, [updateState.ok]);

  const COL_COUNT = 9;

  // 退学等で在籍生徒の選択肢に含まれない場合でも、現在の生徒を選択肢に残す
  const studentChoices = students.some((s) => s.id === report.student_id)
    ? students
    : [
        { id: report.student_id, name: report.student_name ?? "(在籍外の生徒)", student_number: "—" },
        ...students,
      ];

  return (
    <>
      <tr className={report.fell_off ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}>
        <Td className="whitespace-nowrap text-gray-600">{fmtDate(report.report_date)}</Td>
        <Td className="whitespace-nowrap">
          {report.student_name ? (
            <Link
              href={`/admin/students/${report.student_id}`}
              className="font-semibold text-brand-700 hover:underline"
            >
              {report.student_name}
            </Link>
          ) : (
            "—"
          )}
        </Td>
        <Td className="whitespace-nowrap">
          {report.horse_name ? (
            <span className="text-gray-800">
              <Link href={`/admin/horses/${report.horse_id}`} className="font-semibold text-brand-700 hover:underline">
                {report.horse_name}
              </Link>
              {report.horse_is_retouch && (
                <span className="ml-1">
                  <Badge tone="purple">リタッチ</Badge>
                </span>
              )}
            </span>
          ) : (
            "—"
          )}
        </Td>
        <Td className="whitespace-nowrap text-gray-600">{report.lesson ?? "—"}</Td>
        <Td className="whitespace-nowrap">
          {report.fell_off ? <Badge tone="red">落馬</Badge> : <span className="text-gray-400">—</span>}
        </Td>
        <Td className="whitespace-nowrap text-gray-700">
          {report.rideability != null ? (
            <>
              {report.rideability}
              <span className="ml-1 text-xs text-gray-500">{RIDEABILITY_LABELS[report.rideability] ?? ""}</span>
            </>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </Td>
        <Td className="max-w-72">
          <p className="line-clamp-2 whitespace-pre-wrap text-gray-800" title={report.content}>
            {report.content}
          </p>
          {report.incident?.trim() && (
            <p className="mt-1 whitespace-pre-wrap bg-amber-50 px-2 py-1 text-xs text-amber-800" title={report.incident}>
              ⚠ {report.incident}
            </p>
          )}
        </Td>
        <Td className="max-w-56">
          {report.horse_condition ? (
            <p className="line-clamp-2 whitespace-pre-wrap text-gray-600" title={report.horse_condition}>
              {report.horse_condition}
            </p>
          ) : (
            <span className="text-gray-400">—</span>
          )}
          {report.horse_mood && (
            <span className="mt-1 inline-block">
              <Badge tone="gray">{report.horse_mood}</Badge>
            </span>
          )}
        </Td>
        <Td className="whitespace-nowrap">
          <div className="flex items-center gap-2">
            <button type="button" className={btnSmall} onClick={() => setEditing((v) => !v)}>
              {editing ? "閉じる" : "編集"}
            </button>
            <form
              action={deleteAction}
              onSubmit={(e) => {
                if (
                  !window.confirm(
                    `${fmtDate(report.report_date)} ${report.student_name ?? ""}(${report.horse_name ?? "馬"})の騎乗報告を削除します。この操作は取り消せません。よろしいですか?`
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={report.id} />
              <button type="submit" disabled={deleting} className={btnSmallDanger}>
                {deleting ? "削除中…" : "削除"}
              </button>
            </form>
          </div>
        </Td>
      </tr>

      {deleteState.error && (
        <tr>
          <td colSpan={COL_COUNT} className="border-t border-gray-100 bg-red-50 px-4 py-2 text-sm text-red-600">
            {deleteState.error}
          </td>
        </tr>
      )}

      {editing && (
        <tr>
          <td colSpan={COL_COUNT} className="border-t border-gray-200 bg-gray-50 px-4 py-4">
            <form action={updateAction} className="space-y-4">
              <input type="hidden" name="id" value={report.id} />

              {updateState.error && (
                <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{updateState.error}</p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="生徒" required>
                  <select name="student_id" required defaultValue={report.student_id} className={inputCls}>
                    {studentChoices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.student_number})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="馬" required>
                  <select name="horse_id" required defaultValue={report.horse_id} className={inputCls}>
                    {horses.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                        {h.is_retouch ? " 🔁リタッチ" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="日付" required>
                  <input
                    type="date"
                    name="report_date"
                    required
                    defaultValue={report.report_date}
                    className={inputCls}
                  />
                </Field>
                <Field label="時限・授業名">
                  <input name="lesson" defaultValue={report.lesson ?? ""} className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Field label="騎乗内容" required>
                  <textarea name="content" required rows={3} defaultValue={report.content} className={inputCls} />
                </Field>
                <Field label="馬の状態">
                  <textarea
                    name="horse_condition"
                    rows={3}
                    defaultValue={report.horse_condition ?? ""}
                    className={inputCls}
                  />
                </Field>
              </div>

              <EvalFields
                defaults={{
                  fell_off: report.fell_off,
                  rideability: report.rideability,
                  horse_mood: report.horse_mood,
                  incident: report.incident,
                }}
              />

              <p className="text-xs text-gray-500">
                ※ 月次AI要約に反映するには、
                <Link href="/admin/retouch" className="mx-1 font-semibold text-brand-600 hover:underline">
                  リタッチ馬 月次報告
                </Link>
                ページで再生成してください。
              </p>

              <div className="flex items-center gap-3">
                <button type="submit" disabled={updating} className={btnPrimary}>
                  {updating ? "保存中…" : "変更を保存する"}
                </button>
                <button type="button" className={btnSmall} onClick={() => setEditing(false)}>
                  キャンセル
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

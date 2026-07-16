"use client";

import { useActionState } from "react";
import type { AttendanceStatus } from "@/lib/types";
import { saveAttendance, type ActionState } from "./actions";

const BUTTONS: { value: AttendanceStatus; label: string; activeCls: string }[] = [
  { value: "present", label: "出席", activeCls: "border-emerald-600 bg-emerald-600 text-white" },
  { value: "absent", label: "欠席", activeCls: "border-red-600 bg-red-600 text-white" },
  { value: "late", label: "遅刻", activeCls: "border-amber-500 bg-amber-500 text-white" },
  { value: "early_leave", label: "早退", activeCls: "border-blue-600 bg-blue-600 text-white" },
];

export default function AttendanceForm({
  studentId,
  date,
  current,
  note,
}: {
  studentId: string;
  date: string;
  current: AttendanceStatus | null;
  note: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveAttendance, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="date" value={date} />
      <div className="flex overflow-hidden rounded-lg border border-gray-300">
        {BUTTONS.map((b, i) => (
          <button
            key={b.value}
            type="submit"
            name="status"
            value={b.value}
            disabled={pending}
            className={`px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
              i > 0 ? "border-l border-gray-300" : ""
            } ${current === b.value ? b.activeCls : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <input
        name="note"
        defaultValue={note ?? ""}
        placeholder="備考 (体調不良 等)"
        className="w-40 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      {pending && <span className="text-xs text-gray-400">保存中…</span>}
      {!pending && state.ok && <span className="text-xs font-semibold text-emerald-600">✓ 保存済</span>}
      {!pending && state.error && <span className="text-xs font-semibold text-red-600">{state.error}</span>}
    </form>
  );
}

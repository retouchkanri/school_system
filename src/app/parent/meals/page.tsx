import { requireRole } from "@/lib/auth";
import { getStudentsForParent } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, toDateInput, daysAgo } from "@/lib/format";
import { MEAL_LABELS } from "@/lib/constants";
import { Section, PageHeader, EmptyState, SimpleTable, Td, SectionTitle } from "@/components/ui";
import type { MealRecord, MealType } from "@/lib/types";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner"];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function MealMark({ record }: { record: MealRecord | undefined }) {
  if (!record) return <span className="text-gray-300">—</span>;
  return record.eaten ? (
    <span title={record.note ?? undefined} className="text-base font-bold text-emerald-600">
      ○
    </span>
  ) : (
    <span title={record.note ?? undefined} className="text-base font-bold text-red-500">
      ×
    </span>
  );
}

export default async function ParentMealsPage() {
  const profile = await requireRole("parent");
  const students = await getStudentsForParent(profile.id);

  if (students.length === 0) {
    return (
      <div>
        <PageHeader title="お子様の食事記録" />
        <Section>
          <EmptyState message="お子様の生徒情報が登録されていません。学校までお問い合わせください。" />
        </Section>
      </div>
    );
  }

  const days: { date: Date; iso: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i);
    days.push({ date: d, iso: toDateInput(d) });
  }

  const { data } = await adminDb()
    .from("meal_records")
    .select("*")
    .in(
      "student_id",
      students.map((s) => s.id)
    )
    .gte("date", days[0].iso);

  const records = (data ?? []) as MealRecord[];

  return (
    <div>
      <PageHeader
        title="お子様の食事記録"
        description="直近7日間の食事記録です(○=喫食 / ×=欠食 / —=記録なし)"
      />

      {students.map((student) => {
        const byKey = new Map<string, MealRecord>();
        for (const r of records) {
          if (r.student_id === student.id) byKey.set(`${r.date}_${r.meal}`, r);
        }
        return (
          <div key={student.id}>
            <SectionTitle>
              {student.name}({student.student_number})
            </SectionTitle>
            <SimpleTable headers={["日付", ...MEAL_ORDER.map((m) => MEAL_LABELS[m])]}>
              {days.map((d) => (
                <tr key={d.iso} className="hover:bg-gray-50">
                  <Td className="whitespace-nowrap text-gray-700">
                    {fmtDate(d.iso)} ({WEEKDAYS[d.date.getDay()]})
                  </Td>
                  {MEAL_ORDER.map((meal) => (
                    <Td key={meal} className="text-center">
                      <MealMark record={byKey.get(`${d.iso}_${meal}`)} />
                    </Td>
                  ))}
                </tr>
              ))}
            </SimpleTable>
          </div>
        );
      })}

      <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        ※ 欠食が目立つ場合は学校までご相談ください。
      </p>
    </div>
  );
}

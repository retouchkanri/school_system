import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, toDateInput, daysAgo } from "@/lib/format";
import { MEAL_LABELS } from "@/lib/constants";
import { Section, PageHeader, EmptyState, SimpleTable, Td } from "@/components/ui";
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

export default async function StudentMealsPage() {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);

  if (!student) {
    return (
      <div>
        <PageHeader title="食事記録" />
        <Section>
          <EmptyState message="生徒情報が登録されていません。学校までお問い合わせください。" />
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
    .eq("student_id", student.id)
    .gte("date", days[0].iso);

  const records = (data ?? []) as MealRecord[];
  const byKey = new Map<string, MealRecord>();
  for (const r of records) byKey.set(`${r.date}_${r.meal}`, r);

  return (
    <div>
      <PageHeader title="食事記録" description="直近7日間の食事記録です(○=喫食 / ×=欠食 / —=記録なし)" />

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

      <p className="mt-4 text-xs text-gray-400">
        ※ 記録は食堂スタッフが入力しています。誤りがある場合は寮スタッフまでお知らせください。
      </p>
    </div>
  );
}

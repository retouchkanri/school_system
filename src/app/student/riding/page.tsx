import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, toDateInput } from "@/lib/format";
import { Card, PageHeader, EmptyState, Table, Td, SectionTitle } from "@/components/ui";
import type { Horse, RidingReport } from "@/lib/types";
import RidingForm, { type HorseOption } from "./riding-form";

type RidingReportWithHorse = RidingReport & { horses: { name: string } | null };

export default async function StudentRidingPage() {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);

  if (!student) {
    return (
      <div>
        <PageHeader title="騎乗報告" />
        <Card>
          <EmptyState message="生徒情報が登録されていません。学校までお問い合わせください。" />
        </Card>
      </div>
    );
  }

  const db = adminDb();
  const [horsesRes, reportsRes] = await Promise.all([
    db.from("horses").select("*").order("name", { ascending: true }),
    db
      .from("riding_reports")
      .select("*, horses(name)")
      .eq("student_id", student.id)
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const horses = (horsesRes.data ?? []) as Horse[];
  const reports = (reportsRes.data ?? []) as unknown as RidingReportWithHorse[];

  const horseOptions: HorseOption[] = horses.map((h) => ({ id: h.id, name: h.name, is_retouch: h.is_retouch }));

  return (
    <div>
      <PageHeader title="騎乗報告" description="授業での騎乗内容と馬の状態を報告してください(🔁 はリタッチ馬)" />

      <Card title="騎乗報告を提出する">
        <RidingForm horses={horseOptions} defaultHorseId={student.assigned_horse_id} defaultDate={toDateInput()} />
      </Card>

      <SectionTitle>自分の報告履歴(最新20件)</SectionTitle>
      {reports.length === 0 ? (
        <Card>
          <EmptyState message="騎乗報告はまだありません" />
        </Card>
      ) : (
        <Table headers={["日付", "馬", "時限・授業名", "騎乗内容", "馬の状態"]}>
          {reports.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <Td className="whitespace-nowrap text-gray-700">{fmtDate(r.report_date)}</Td>
              <Td className="whitespace-nowrap font-medium text-gray-800">{r.horses?.name ?? "—"}</Td>
              <Td className="whitespace-nowrap text-gray-600">{r.lesson ?? "—"}</Td>
              <Td className="max-w-[18rem]">
                <p className="whitespace-pre-wrap text-gray-700">{r.content}</p>
              </Td>
              <Td className="max-w-[14rem]">
                <p className="whitespace-pre-wrap text-gray-600">{r.horse_condition ?? "—"}</p>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

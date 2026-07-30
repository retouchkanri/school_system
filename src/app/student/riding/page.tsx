import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { toDateInput } from "@/lib/format";
import { Card, PageHeader, EmptyState, Table, SectionTitle } from "@/components/ui";
import type { Horse, RidingReport } from "@/lib/types";
import RidingForm, { type HorseOption } from "./riding-form";
import ReportRow from "./report-row";

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
        <>
          <Table headers={["日付", "馬", "時限・授業名", "落馬", "乗りやすさ", "騎乗内容", "馬の状態", "操作"]}>
            {reports.map((r) => (
              <ReportRow
                key={r.id}
                horses={horseOptions}
                report={{
                  id: r.id,
                  report_date: r.report_date,
                  horse_id: r.horse_id,
                  horse_name: r.horses?.name ?? null,
                  lesson: r.lesson,
                  content: r.content,
                  horse_condition: r.horse_condition,
                  fell_off: r.fell_off ?? false,
                  rideability: r.rideability,
                  horse_mood: r.horse_mood,
                  incident: r.incident,
                }}
              />
            ))}
          </Table>
          <p className="mt-3 text-xs text-gray-400">
            ※ 編集・削除した内容はリタッチ馬の月次AI要約には自動反映されません。反映が必要な場合は、学校職員が「リタッチ馬
            月次報告」ページで要約を再生成する必要があるため、担当職員へお知らせください。
          </p>
        </>
      )}
    </div>
  );
}

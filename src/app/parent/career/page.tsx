import { requireRole } from "@/lib/auth";
import { getStudentsForParent } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { Section, PageHeader, EmptyState, Badge, InfoRow, SectionTitle, type BadgeTone } from "@/components/ui";
import { CAREER_OUTCOME_LABELS } from "@/lib/constants";
import type { CareerRecord, CareerOutcomeType } from "@/lib/types";

const OUTCOME_TONES: Record<CareerOutcomeType, BadgeTone> = {
  employment: "green",
  further_education: "blue",
  other: "gray",
};

export default async function ParentCareerPage() {
  const profile = await requireRole("parent");
  const students = await getStudentsForParent(profile.id);

  if (students.length === 0) {
    return (
      <div>
        <PageHeader title="お子様の進路" />
        <Section>
          <EmptyState message="お子様の生徒情報が登録されていません。学校までお問い合わせください。" />
        </Section>
      </div>
    );
  }

  const { data } = await adminDb()
    .from("career_records")
    .select("*")
    .in(
      "student_id",
      students.map((s) => s.id)
    )
    .order("created_at", { ascending: false });

  const records = (data ?? []) as CareerRecord[];

  return (
    <div>
      <PageHeader title="お子様の進路" description="就職・進学など、お子様の進路の記録です" />

      {students.map((student) => {
        const own = records.filter((r) => r.student_id === student.id);
        return (
          <div key={student.id}>
            <SectionTitle>
              {student.name}({student.student_number})
            </SectionTitle>
            {own.length === 0 ? (
              <Section>
                <EmptyState message="進路はまだ決定していません" />
              </Section>
            ) : (
              <div className="space-y-4">
                {own.map((r) => (
                  <Section
                    key={r.id}
                    title={r.organization}
                    action={<Badge tone={OUTCOME_TONES[r.outcome_type]}>{CAREER_OUTCOME_LABELS[r.outcome_type]}</Badge>}
                  >
                    <dl>
                      <InfoRow label="職種・コース" value={r.position ?? "—"} />
                      <InfoRow label="決定日" value={fmtDate(r.decided_date)} />
                      {r.notes && <InfoRow label="備考" value={<span className="whitespace-pre-wrap">{r.notes}</span>} />}
                    </dl>
                  </Section>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

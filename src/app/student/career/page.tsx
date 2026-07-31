import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { Section, PageHeader, EmptyState, Badge, InfoRow, type BadgeTone } from "@/components/ui";
import { CAREER_OUTCOME_LABELS } from "@/lib/constants";
import type { CareerRecord, CareerOutcomeType } from "@/lib/types";

const OUTCOME_TONES: Record<CareerOutcomeType, BadgeTone> = {
  employment: "green",
  further_education: "blue",
  other: "gray",
};

export default async function StudentCareerPage() {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);

  if (!student) {
    return (
      <div>
        <PageHeader title="進路" />
        <Section>
          <EmptyState message="生徒情報が登録されていません。学校までお問い合わせください。" />
        </Section>
      </div>
    );
  }

  const { data } = await adminDb()
    .from("career_records")
    .select("*")
    .eq("student_id", student.id)
    .order("created_at", { ascending: false });

  const records = (data ?? []) as CareerRecord[];

  return (
    <div>
      <PageHeader title="進路" description="就職・進学など、あなたの進路の記録です" />

      {records.length === 0 ? (
        <Section>
          <EmptyState message="進路はまだ決定していません" />
        </Section>
      ) : (
        <div className="space-y-4">
          {records.map((r) => (
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
}

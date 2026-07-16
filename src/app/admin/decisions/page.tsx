import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { ADMISSION_RESULT_LABELS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import {
  Card,
  PageHeader,
  EmptyState,
  Badge,
  Table,
  Td,
  SectionTitle,
  type BadgeTone,
} from "@/components/ui";
import type { AdmissionDecision, AdmissionResult, Application, Lead } from "@/lib/types";
import DecisionForm from "./decision-form";

type CandidateRow = Application & {
  leads: Pick<Lead, "id" | "name" | "ai_type" | "ai_enrollment_probability"> | null;
};
type DecisionRow = AdmissionDecision & { leads: { name: string } | null };

const RESULT_TONES: Record<AdmissionResult, BadgeTone> = {
  accepted: "green",
  rejected: "red",
  waitlist: "amber",
};

const APP_STATUS_TONES: Record<string, BadgeTone> = {
  under_review: "amber",
  interview_scheduled: "purple",
  decided: "green",
};

const NOTIFY_LABELS: Record<string, string> = {
  email: "メール",
  line: "LINE",
  postal: "郵送",
};

export default async function AdminDecisionsPage() {
  await requireRole("admin");
  const db = adminDb();

  const [{ data: candidatesData }, { data: decisionsData }] = await Promise.all([
    db
      .from("applications")
      .select("*, leads(id, name, ai_type, ai_enrollment_probability)")
      .in("status", ["under_review", "interview_scheduled", "decided"])
      .order("created_at", { ascending: false }),
    db
      .from("admission_decisions")
      .select("*, leads(name)")
      .order("created_at", { ascending: false }),
  ]);
  const candidates = (candidatesData ?? []) as CandidateRow[];
  const decisions = (decisionsData ?? []) as DecisionRow[];

  const decidedLeadIds = new Set(decisions.map((d) => d.lead_id));
  const formCandidates: { leadId: string; name: string }[] = [];
  for (const c of candidates) {
    if (c.leads && !decidedLeadIds.has(c.leads.id)) {
      formCandidates.push({ leadId: c.leads.id, name: c.leads.name });
    }
  }

  return (
    <div>
      <PageHeader
        title="合否管理"
        description="審査中・面接済みの受験者の合否登録と通知を行います"
      />

      <SectionTitle>判定対象一覧</SectionTitle>
      {candidates.length === 0 ? (
        <EmptyState message="判定対象の受験者はいません" />
      ) : (
        <Table headers={["氏名", "出願ステータス", "面接日", "AIタイプ", "AI入学確率", "合否"]}>
          {candidates.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <Td className="font-medium text-gray-900">{c.leads?.name ?? "—"}</Td>
              <Td>
                <Badge tone={APP_STATUS_TONES[c.status] ?? "gray"}>
                  {APPLICATION_STATUS_LABELS[c.status]}
                </Badge>
              </Td>
              <Td className="text-gray-600">{fmtDate(c.interview_date)}</Td>
              <Td className="text-gray-600">{c.leads?.ai_type ?? "—"}</Td>
              <Td>
                {c.leads?.ai_enrollment_probability != null ? (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{
                          width: `${Math.max(0, Math.min(100, c.leads.ai_enrollment_probability))}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-700">
                      {c.leads.ai_enrollment_probability}%
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </Td>
              <Td>
                {c.leads && decidedLeadIds.has(c.leads.id) ? (
                  <Badge tone="green">登録済</Badge>
                ) : (
                  <Badge tone="gray">未登録</Badge>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <SectionTitle>合否登録</SectionTitle>
      <Card>
        <DecisionForm candidates={formCandidates} />
      </Card>

      <SectionTitle>登録済み合否一覧</SectionTitle>
      {decisions.length === 0 ? (
        <EmptyState message="合否登録がまだありません" />
      ) : (
        <Table headers={["氏名", "結果", "通知方法", "通知日時"]}>
          {decisions.map((d) => (
            <tr key={d.id} className="hover:bg-gray-50">
              <Td className="font-medium text-gray-900">{d.leads?.name ?? "—"}</Td>
              <Td>
                <Badge tone={RESULT_TONES[d.result]}>{ADMISSION_RESULT_LABELS[d.result]}</Badge>
              </Td>
              <Td className="text-gray-600">
                {d.notified_via.length > 0
                  ? d.notified_via.map((v) => NOTIFY_LABELS[v] ?? v).join(" / ")
                  : "—"}
              </Td>
              <Td className="text-gray-600">{fmtDateTime(d.notified_at)}</Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

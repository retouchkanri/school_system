import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, fmtDateTime } from "@/lib/format";
import {
  APPLICATION_DOCUMENTS,
  APPLICATION_STATUS_LABELS,
  APTITUDE_TRAITS,
  SUITABILITY_LABELS,
} from "@/lib/constants";
import { isApplicationDocumentFile } from "@/lib/documents";
import {
  PageHeader,
  EmptyState,
  Badge,
  Table,
  Td,
  SectionTitle,
  btnSmall,
  type BadgeTone,
} from "@/components/ui";
import type { Application, AptitudeTest } from "@/lib/types";
import StatusForm from "./status-form";

type ApplicationRow = Application & { leads: { name: string } | null };
type AptitudeRow = AptitudeTest & { leads: { name: string } | null };

const STATUS_TONES: Record<Application["status"], BadgeTone> = {
  draft: "gray",
  submitted: "blue",
  under_review: "amber",
  interview_scheduled: "purple",
  decided: "green",
};

export default async function AdminApplicationsPage() {
  await requireRole("admin");
  const db = adminDb();

  const [{ data: appsData }, { data: aptitudeData }] = await Promise.all([
    db.from("applications").select("*, leads(name)").order("created_at", { ascending: false }),
    db.from("aptitude_tests").select("*, leads(name)").order("completed_at", { ascending: false }),
  ]);
  const applications = (appsData ?? []) as ApplicationRow[];
  const aptitudeTests = (aptitudeData ?? []) as AptitudeRow[];

  return (
    <div>
      <PageHeader
        title="出願・適性検査"
        description="出願書類の確認、面接日程の設定、性格・適性検査の結果を管理します"
      />

      <SectionTitle>出願一覧</SectionTitle>
      {applications.length === 0 ? (
        <EmptyState message="出願がまだありません" />
      ) : (
        <Table headers={["氏名", "提出書類", "ステータス", "面接日", "提出日", "ステータス変更"]}>
          {applications.map((app) => {
            const hasAnyDoc = APPLICATION_DOCUMENTS.some((doc) =>
              doc.kind === "text" ? !!app.essay?.trim() : isApplicationDocumentFile(app.documents?.[doc.key])
            );
            return (
            <tr key={app.id} className="hover:bg-gray-50">
              <Td className="font-medium text-gray-900">{app.leads?.name ?? "—"}</Td>
              <Td>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {APPLICATION_DOCUMENTS.map((doc) => {
                    const ok = doc.kind === "text" ? !!app.essay?.trim() : isApplicationDocumentFile(app.documents?.[doc.key]);
                    return (
                      <span key={doc.key} className={ok ? "text-emerald-600" : "text-gray-400"}>
                        <span className="font-bold">{ok ? "○" : "×"}</span> {doc.label}
                      </span>
                    );
                  })}
                </div>
                {hasAnyDoc && (
                  <a href={`/api/admin/applications/${app.id}/documents`} className={`${btnSmall} mt-2`}>
                    書類を一括ダウンロード
                  </a>
                )}
              </Td>
              <Td>
                <Badge tone={STATUS_TONES[app.status]}>{APPLICATION_STATUS_LABELS[app.status]}</Badge>
              </Td>
              <Td className="text-gray-600">{fmtDate(app.interview_date)}</Td>
              <Td className="text-gray-600">{fmtDate(app.submitted_at)}</Td>
              <Td>
                {app.status === "decided" ? (
                  <span className="text-xs text-gray-400">判定済のため変更不可</span>
                ) : app.status === "draft" ? (
                  <span className="text-xs text-gray-400">提出待ち</span>
                ) : (
                  <StatusForm
                    applicationId={app.id}
                    currentStatus={app.status}
                    interviewDate={app.interview_date}
                  />
                )}
              </Td>
            </tr>
            );
          })}
        </Table>
      )}

      <SectionTitle>性格・適性検査の結果</SectionTitle>
      {aptitudeTests.length === 0 ? (
        <EmptyState message="適性検査の受検者がまだいません" />
      ) : (
        <div className="space-y-3">
          {aptitudeTests.map((test) => {
            const suitEntries = Object.entries(test.suitability ?? {}).sort((a, b) => b[1] - a[1]);
            const best = suitEntries[0];
            return (
              <details
                key={test.id}
                className="group border border-gray-200 bg-white shadow-sm"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-3">
                  <span className="text-gray-400 transition group-open:rotate-90">▶</span>
                  <span className="font-semibold text-gray-900">{test.leads?.name ?? "—"}</span>
                  <span className="text-xs text-gray-500">受検日時: {fmtDateTime(test.completed_at)}</span>
                  {best && (
                    <Badge tone="brand">
                      最適性: {SUITABILITY_LABELS[best[0]] ?? best[0]} {best[1]}%
                    </Badge>
                  )}
                </summary>
                <div className="grid gap-6 border-t border-gray-100 p-5 lg:grid-cols-2">
                  <div>
                    <h4 className="mb-3 text-xs font-bold text-gray-500">特性スコア (0-100)</h4>
                    {test.scores ? (
                      <div className="space-y-2">
                        {Object.entries(APTITUDE_TRAITS).map(([key, label]) => {
                          const score = test.scores?.[key] ?? 0;
                          return (
                            <div key={key} className="flex items-center gap-2">
                              <span className="w-36 shrink-0 text-xs text-gray-600">{label}</span>
                              <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full bg-brand-500"
                                  style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                                />
                              </div>
                              <span className="w-8 shrink-0 text-right text-xs font-bold text-gray-700">
                                {score}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">スコア未算出</p>
                    )}
                    <h4 className="mb-3 mt-6 text-xs font-bold text-gray-500">職業適性</h4>
                    {suitEntries.length > 0 ? (
                      <div className="space-y-2">
                        {suitEntries.map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="w-36 shrink-0 text-xs text-gray-600">
                              {SUITABILITY_LABELS[key] ?? key}
                            </span>
                            <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-amber-500"
                                style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                              />
                            </div>
                            <span className="w-10 shrink-0 text-right text-xs font-bold text-gray-700">
                              {value}%
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">適性未算出</p>
                    )}
                  </div>
                  <div>
                    <h4 className="mb-3 text-xs font-bold text-gray-500">AI分析レポート</h4>
                    {test.ai_report ? (
                      <p className="whitespace-pre-wrap rounded-lg bg-brand-50 p-4 text-sm leading-relaxed text-gray-700">
                        {test.ai_report}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">レポート未生成</p>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

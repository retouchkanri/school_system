import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDateTime } from "@/lib/format";
import { PROCEDURE_STATUS_LABELS, statusIndex } from "@/lib/constants";
import {
  Card,
  PageHeader,
  EmptyState,
  Badge,
  LeadStatusBadge,
  InfoRow,
  btnSmall,
  type BadgeTone,
} from "@/components/ui";
import type { EnrollmentProcedure, Lead, LeadStatus, ProcedureStatus } from "@/lib/types";
import { advanceEnrollmentStepAction } from "./actions";

type AcceptedRow = {
  id: string;
  lead_id: string;
  leads: Pick<Lead, "id" | "name" | "status"> | null;
};

const PROCEDURE_TONES: Record<ProcedureStatus, BadgeTone> = {
  not_started: "gray",
  in_progress: "amber",
  completed: "green",
};

const FINAL_STEPS: { step: LeadStatus; label: string }[] = [
  { step: "uniform_ordered", label: "制服注文済" },
  { step: "dorm_ready", label: "入寮準備完了" },
  { step: "enrolled", label: "入学式完了(入学確定)" },
];

function Mark({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="font-bold text-emerald-600">○</span>
  ) : (
    <span className="font-bold text-red-400">×</span>
  );
}

function ItemBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <p className="text-[11px] font-semibold text-gray-500">{label}</p>
      <div className="mt-1 text-sm text-gray-800">{children}</div>
    </div>
  );
}

export default async function AdminEnrollmentsPage() {
  await requireRole("admin");
  const db = adminDb();

  const { data: acceptedData } = await db
    .from("admission_decisions")
    .select("id, lead_id, leads(id, name, status)")
    .eq("result", "accepted")
    .order("created_at", { ascending: false });
  const accepted = (acceptedData ?? []) as unknown as AcceptedRow[];

  const leadIds = accepted.map((a) => a.lead_id);
  let procedures: EnrollmentProcedure[] = [];
  if (leadIds.length > 0) {
    const { data: procData } = await db
      .from("enrollment_procedures")
      .select("*")
      .in("lead_id", leadIds);
    procedures = (procData ?? []) as EnrollmentProcedure[];
  }
  const procByLead = new Map(procedures.map((p) => [p.lead_id, p]));

  return (
    <div>
      <PageHeader
        title="入学手続き管理"
        description="合格者の入学手続き状況の確認と、入学までの最終ステップを進行します"
      />

      {accepted.length === 0 ? (
        <EmptyState message="合格者がまだいません" />
      ) : (
        <div className="space-y-6">
          {accepted.map((row) => {
            const lead = row.leads;
            if (!lead) return null;
            const proc = procByLead.get(row.lead_id);
            const currentIdx = statusIndex(lead.status);
            return (
              <Card
                key={row.id}
                title={lead.name}
                action={
                  <div className="flex items-center gap-2">
                    <Badge tone={PROCEDURE_TONES[proc?.status ?? "not_started"]}>
                      手続き: {PROCEDURE_STATUS_LABELS[proc?.status ?? "not_started"]}
                    </Badge>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <ItemBox label="提出物">
                    <div className="space-y-0.5 text-xs">
                      <p>
                        <Mark ok={proc?.photo_submitted ?? false} /> 顔写真
                      </p>
                      <p>
                        <Mark ok={proc?.insurance_card_submitted ?? false} /> 保険証
                      </p>
                      <p>
                        <Mark ok={proc?.my_number_submitted ?? false} /> マイナンバー
                      </p>
                    </div>
                  </ItemBox>
                  <ItemBox label="サイズ">
                    <div className="space-y-0.5 text-xs">
                      <p>制服: {proc?.uniform_size ?? "—"}</p>
                      <p>ブーツ: {proc?.boots_size ?? "—"}</p>
                      <p>ヘルメット: {proc?.helmet_size ?? "—"}</p>
                    </div>
                  </ItemBox>
                  <ItemBox label="規約同意">
                    <Mark ok={proc?.agreement_accepted ?? false} />{" "}
                    <span className="text-xs">{proc?.agreement_accepted ? "同意済" : "未同意"}</span>
                  </ItemBox>
                  <ItemBox label="電子署名">
                    {proc?.signature ? (
                      <div className="text-xs">
                        <p className="font-serif text-sm italic text-gray-900">{proc.signature}</p>
                        <p className="mt-0.5 text-gray-400">{fmtDateTime(proc.signed_at)}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">未署名</span>
                    )}
                  </ItemBox>
                </div>

                <details className="group mt-4 rounded-lg border border-gray-100">
                  <summary className="cursor-pointer list-none rounded-lg bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100">
                    <span className="mr-1 inline-block transition group-open:rotate-90">▶</span>
                    詳細情報(緊急連絡先・保証人・健康情報)
                  </summary>
                  <div className="grid gap-6 p-4 lg:grid-cols-3">
                    <div>
                      <p className="mb-2 text-xs font-bold text-gray-500">緊急連絡先</p>
                      {proc && proc.emergency_contacts.length > 0 ? (
                        <ul className="space-y-1 text-sm text-gray-700">
                          {proc.emergency_contacts.map((c, i) => (
                            <li key={i} className="rounded bg-gray-50 px-2 py-1">
                              {c.name}({c.relation}) {c.phone}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-400">未登録</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-bold text-gray-500">保証人</p>
                      {proc && proc.guarantor && proc.guarantor.name ? (
                        <dl>
                          <InfoRow label="氏名" value={proc.guarantor.name} />
                          <InfoRow label="続柄" value={proc.guarantor.relation ?? "—"} />
                          <InfoRow label="電話" value={proc.guarantor.phone ?? "—"} />
                          <InfoRow label="住所" value={proc.guarantor.address ?? "—"} />
                        </dl>
                      ) : (
                        <p className="text-xs text-gray-400">未登録</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-bold text-gray-500">健康情報</p>
                      <dl>
                        <InfoRow label="アレルギー" value={proc?.allergies || "なし"} />
                        <InfoRow label="常備薬" value={proc?.medications || "なし"} />
                        <InfoRow label="持病" value={proc?.medical_conditions || "なし"} />
                      </dl>
                    </div>
                  </div>
                </details>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                  <span className="text-xs font-semibold text-gray-500">最終ステップ:</span>
                  {FINAL_STEPS.map(({ step, label }) => {
                    const reached = currentIdx >= statusIndex(step);
                    return reached ? (
                      <span
                        key={step}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                      >
                        ✓ {label}
                      </span>
                    ) : (
                      <form key={step} action={advanceEnrollmentStepAction}>
                        <input type="hidden" name="lead_id" value={lead.id} />
                        <input type="hidden" name="step" value={step} />
                        <button className={btnSmall}>{label}</button>
                      </form>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

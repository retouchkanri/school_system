import { requireRole } from "@/lib/auth";
import { getStudentsForParent } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, fmtYen } from "@/lib/format";
import { INSURANCE_CLAIM_STATUS_LABELS } from "@/lib/constants";
import {
  Section,
  PageHeader,
  EmptyState,
  Badge,
  SimpleTable,
  Td,
  SectionTitle,
} from "@/components/ui";
import type { Horse, InjuryRecord, InsuranceClaim } from "@/lib/types";
import ParentClaimForm, { type ChildOption, type ParentInjuryOption } from "./claim-form";
import ParentWithdrawButton from "./withdraw-button";
import { CLAIM_STATUS_HINTS, CLAIM_STATUS_TONES, SEVERITY_TONES, claimantLabel } from "./options";

type InjuryRow = InjuryRecord & { horse: Pick<Horse, "id" | "name"> | null };
type ClaimRow = InsuranceClaim & {
  injury: Pick<InjuryRecord, "id" | "date" | "occurred_at" | "body_part"> | null;
};

export default async function ParentInsurancePage() {
  const profile = await requireRole("parent");
  const students = await getStudentsForParent(profile.id);

  if (students.length === 0) {
    return (
      <div>
        <PageHeader title="怪我・保険" />
        <Section>
          <EmptyState message="お子様の生徒情報が登録されていません。学校までお問い合わせください。" />
        </Section>
      </div>
    );
  }

  const studentIds = students.map((s) => s.id);
  const db = adminDb();
  // 個人情報のため、必ず自分の子の student_id に絞って取得する
  const [{ data: injuriesData }, { data: claimsData }] = await Promise.all([
    db
      .from("injury_records")
      .select("*, horse:horses(id, name)")
      .in("student_id", studentIds)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    db
      .from("insurance_claims")
      .select("*, injury:injury_records(id, date, occurred_at, body_part)")
      .in("student_id", studentIds)
      .order("created_at", { ascending: false }),
  ]);

  const injuries = (injuriesData ?? []) as InjuryRow[];
  const claims = (claimsData ?? []) as ClaimRow[];

  const childOptions: ChildOption[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    student_number: s.student_number,
  }));
  const injuryOptions: ParentInjuryOption[] = injuries.map((i) => ({
    id: i.id,
    student_id: i.student_id,
    label: `${fmtDate(i.date)}${i.occurred_at ? ` / ${i.occurred_at}` : ""}${i.body_part ? ` / ${i.body_part}` : ""}`,
  }));

  return (
    <div>
      <PageHeader
        title="怪我・保険"
        description="学校で記録されたお子様の怪我の確認と、保険の申請ができます"
      />

      <SectionTitle>保険を申請する</SectionTitle>
      <Section>
        <ParentClaimForm students={childOptions} injuries={injuryOptions} />
      </Section>

      {students.map((student) => {
        const myInjuries = injuries.filter((i) => i.student_id === student.id);
        const myClaims = claims.filter((c) => c.student_id === student.id);
        return (
          <div key={student.id}>
            <SectionTitle>
              {student.name} さん({student.student_number})の怪我の記録
            </SectionTitle>
            {myInjuries.length === 0 ? (
              <Section>
                <EmptyState message="記録されている怪我はありません" />
              </Section>
            ) : (
              <SimpleTable headers={["発生日", "場面", "関連馬", "部位", "程度", "症状", "処置", "受診先"]}>
                {myInjuries.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <Td className="whitespace-nowrap text-gray-700">{fmtDate(i.date)}</Td>
                    <Td className="whitespace-nowrap text-gray-700">{i.occurred_at ?? "—"}</Td>
                    <Td className="whitespace-nowrap text-gray-700">{i.horse?.name ?? "—"}</Td>
                    <Td className="whitespace-nowrap text-gray-700">{i.body_part ?? "—"}</Td>
                    <Td>
                      {i.severity ? (
                        <Badge tone={SEVERITY_TONES[i.severity] ?? "gray"}>{i.severity}</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </Td>
                    <Td className="max-w-[16rem]">
                      <p className="whitespace-pre-wrap text-gray-800">{i.description}</p>
                    </Td>
                    <Td className="max-w-[14rem]">
                      <p className="whitespace-pre-wrap text-gray-600">{i.treatment ?? "—"}</p>
                    </Td>
                    <Td className="whitespace-nowrap text-gray-600">{i.hospital ?? "—"}</Td>
                  </tr>
                ))}
              </SimpleTable>
            )}

            <SectionTitle>{student.name} さんの申請の状況</SectionTitle>
            {myClaims.length === 0 ? (
              <Section>
                <EmptyState message="送信した保険申請はまだありません" />
              </Section>
            ) : (
              <SimpleTable
                headers={[
                  "申請日",
                  "申請者",
                  "対象の怪我",
                  "保険会社",
                  "請求額",
                  "事故の概要",
                  "状態",
                  "学校からのコメント",
                  "操作",
                ]}
              >
                {myClaims.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <Td className="whitespace-nowrap text-gray-700">{fmtDate(c.created_at)}</Td>
                    <Td className="whitespace-nowrap text-gray-600">{claimantLabel(c.claimant_role)}</Td>
                    <Td className="whitespace-nowrap text-gray-700">
                      {c.injury ? (
                        <>
                          {fmtDate(c.injury.date)}
                          <span className="ml-1 text-[11px] text-gray-400">
                            {c.injury.occurred_at ?? ""}
                            {c.injury.body_part ? ` / ${c.injury.body_part}` : ""}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400">指定なし</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-gray-700">{c.insurance_company ?? "—"}</Td>
                    <Td className="whitespace-nowrap text-gray-700">
                      {c.claim_amount == null ? "—" : fmtYen(c.claim_amount)}
                    </Td>
                    <Td className="max-w-[16rem]">
                      <p className="whitespace-pre-wrap text-gray-800">{c.incident_summary}</p>
                    </Td>
                    <Td>
                      <Badge tone={CLAIM_STATUS_TONES[c.status]}>{INSURANCE_CLAIM_STATUS_LABELS[c.status]}</Badge>
                      <p className="mt-0.5 text-[11px] text-gray-400">{CLAIM_STATUS_HINTS[c.status]}</p>
                    </Td>
                    <Td className="max-w-[14rem]">
                      <p className="whitespace-pre-wrap text-gray-600">{c.staff_comment ?? "—"}</p>
                    </Td>
                    <Td className="whitespace-nowrap">
                      {c.status === "submitted" && c.submitted_by === profile.id ? (
                        <ParentWithdrawButton id={c.id} />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </SimpleTable>
            )}
          </div>
        );
      })}
    </div>
  );
}

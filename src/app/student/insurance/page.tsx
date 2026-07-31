import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
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
import ClaimForm, { type InjuryOption } from "./claim-form";
import WithdrawButton from "./withdraw-button";
import { CLAIM_STATUS_HINTS, CLAIM_STATUS_TONES, SEVERITY_TONES } from "./options";

type InjuryRow = InjuryRecord & { horse: Pick<Horse, "id" | "name"> | null };
type ClaimRow = InsuranceClaim & {
  injury: Pick<InjuryRecord, "id" | "date" | "occurred_at" | "body_part"> | null;
};

export default async function StudentInsurancePage() {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);

  if (!student) {
    return (
      <div>
        <PageHeader title="怪我・保険" />
        <Section>
          <EmptyState message="生徒情報が登録されていません。学校までお問い合わせください。" />
        </Section>
      </div>
    );
  }

  const db = adminDb();
  // 個人情報のため、必ず自分の student_id に絞って取得する
  const [{ data: injuriesData }, { data: claimsData }] = await Promise.all([
    db
      .from("injury_records")
      .select("*, horse:horses(id, name)")
      .eq("student_id", student.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    db
      .from("insurance_claims")
      .select("*, injury:injury_records(id, date, occurred_at, body_part)")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false }),
  ]);

  const injuries = (injuriesData ?? []) as InjuryRow[];
  const claims = (claimsData ?? []) as ClaimRow[];

  const injuryOptions: InjuryOption[] = injuries.map((i) => ({
    id: i.id,
    label: `${fmtDate(i.date)}${i.occurred_at ? ` / ${i.occurred_at}` : ""}${i.body_part ? ` / ${i.body_part}` : ""}`,
  }));

  return (
    <div>
      <PageHeader
        title="怪我・保険"
        description="学校で記録された怪我の内容の確認と、保険の申請ができます"
      />

      <SectionTitle>怪我の記録</SectionTitle>
      {injuries.length === 0 ? (
        <Section>
          <EmptyState message="記録されている怪我はありません" />
        </Section>
      ) : (
        <SimpleTable headers={["発生日", "場面", "関連馬", "部位", "程度", "症状", "処置", "受診先"]}>
          {injuries.map((i) => (
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

      <SectionTitle>保険を申請する</SectionTitle>
      <Section>
        <ClaimForm injuries={injuryOptions} />
      </Section>

      <SectionTitle>申請の状況</SectionTitle>
      {claims.length === 0 ? (
        <Section>
          <EmptyState message="送信した保険申請はまだありません" />
        </Section>
      ) : (
        <SimpleTable headers={["申請日", "対象の怪我", "保険会社", "請求額", "事故の概要", "状態", "学校からのコメント", "操作"]}>
          {claims.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <Td className="whitespace-nowrap text-gray-700">{fmtDate(c.created_at)}</Td>
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
                  <WithdrawButton id={c.id} />
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
}

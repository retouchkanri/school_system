import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, fmtDateTime, fmtYen, toDateInput } from "@/lib/format";
import { INSURANCE_CLAIM_STATUS_LABELS } from "@/lib/constants";
import {
  PageHeader,
  Card,
  StatCard,
  Table,
  Td,
  Badge,
  EmptyState,
  SectionTitle,
  btnSmall,
} from "@/components/ui";
import type { Horse, InjuryRecord, InsuranceClaim, Student } from "@/lib/types";
import InjuryForm, { type HorseOption, type InjuryEditValues, type StudentOption } from "./injury-form";
import DeleteInjuryButton from "./delete-button";
import ClaimForm from "./claim-form";
import { CLAIM_STATUS_TONES, SEVERITY_TONES, claimantLabel, fiscalYearStart } from "./options";

type InjuryRow = InjuryRecord & {
  student: Pick<Student, "id" | "name" | "student_number"> | null;
  horse: Pick<Horse, "id" | "name"> | null;
};

type ClaimRow = InsuranceClaim & {
  student: Pick<Student, "id" | "name" | "student_number"> | null;
  injury: Pick<InjuryRecord, "id" | "date" | "occurred_at" | "body_part"> | null;
};

export default async function AdminInjuriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const editId = sp.edit ?? "";

  const db = adminDb();
  const [{ data: injuriesData }, { data: claimsData }, { data: studentsData }, { data: horsesData }] =
    await Promise.all([
      db
        .from("injury_records")
        .select("*, student:students(id, name, student_number), horse:horses(id, name)")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(300),
      db
        .from("insurance_claims")
        .select(
          "*, student:students(id, name, student_number), injury:injury_records(id, date, occurred_at, body_part)"
        )
        .order("created_at", { ascending: false })
        .limit(300),
      db.from("students").select("*").order("student_number", { ascending: true }),
      db.from("horses").select("id, name, active").order("name", { ascending: true }),
    ]);

  const injuries = (injuriesData ?? []) as InjuryRow[];
  const claims = (claimsData ?? []) as ClaimRow[];
  const students = (studentsData ?? []) as Student[];
  const horses = (horsesData ?? []) as Pick<Horse, "id" | "name" | "active">[];

  // 在籍中の生徒を先に、それ以外を後に (各グループ内は学籍番号順)
  const studentOptions: StudentOption[] = [
    ...students.filter((s) => s.status === "enrolled"),
    ...students.filter((s) => s.status !== "enrolled"),
  ].map((s) => ({ id: s.id, name: s.name, student_number: s.student_number, status: s.status }));

  // 在厩中の馬を先に表示する
  const horseOptions: HorseOption[] = [
    ...horses.filter((h) => h.active),
    ...horses.filter((h) => !h.active),
  ].map((h) => ({ id: h.id, name: h.name, active: h.active }));

  const editRecordRaw = editId
    ? (((await db.from("injury_records").select("*").eq("id", editId).maybeSingle()).data ??
        null) as InjuryRecord | null)
    : null;
  const editRecord: InjuryEditValues | null = editRecordRaw
    ? {
        id: editRecordRaw.id,
        student_id: editRecordRaw.student_id,
        date: editRecordRaw.date,
        occurred_at: editRecordRaw.occurred_at,
        horse_id: editRecordRaw.horse_id,
        body_part: editRecordRaw.body_part,
        description: editRecordRaw.description,
        severity: editRecordRaw.severity,
        treatment: editRecordRaw.treatment,
        hospital: editRecordRaw.hospital,
        doctor_note: editRecordRaw.doctor_note,
      }
    : null;

  // 怪我記録ごとの保険申請 (一覧の「保険申請」列で最新の状態を出すため)
  const claimsByInjury = new Map<string, ClaimRow[]>();
  for (const c of claims) {
    if (!c.injury_record_id) continue;
    const list = claimsByInjury.get(c.injury_record_id) ?? [];
    list.push(c);
    claimsByInjury.set(c.injury_record_id, list);
  }

  const fyStart = fiscalYearStart();
  const thisYear = injuries.filter((i) => i.date >= fyStart);
  const hospitalCount = thisYear.filter((i) => i.severity === "入院" || i.severity === "通院").length;
  const ridingCount = thisYear.filter((i) => i.occurred_at === "騎乗中").length;
  const openClaims = claims.filter((c) => c.status === "submitted" || c.status === "reviewing").length;

  return (
    <div>
      <PageHeader
        title="怪我・保険申請"
        description="生徒の怪我の記録と、本人・保護者から届いた保険申請の受付・処理を行います"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="今年度の怪我" value={thisYear.length} sub={`${fmtDate(fyStart)} 以降`} />
        <StatCard label="入院・通院" value={hospitalCount} tone={hospitalCount > 0 ? "warning" : "default"} />
        <StatCard label="騎乗中の事故" value={ridingCount} tone={ridingCount > 0 ? "danger" : "default"} />
        <StatCard label="保険申請 処理待ち" value={openClaims} tone={openClaims > 0 ? "warning" : "default"} />
      </div>

      <SectionTitle>怪我記録</SectionTitle>

      <Card title={editRecord ? "怪我記録の編集" : "怪我記録の登録"} className="mb-6">
        <InjuryForm
          key={editRecord?.id ?? "new"}
          students={studentOptions}
          horses={horseOptions}
          defaultDate={toDateInput()}
          record={editRecord}
        />
      </Card>

      {injuries.length === 0 ? (
        <EmptyState message="怪我記録はまだありません" />
      ) : (
        <Table
          headers={["発生日", "生徒", "場面", "関連馬", "部位", "程度", "症状", "処置・受診先", "保険申請", "操作"]}
        >
          {injuries.map((i) => {
            const related = claimsByInjury.get(i.id) ?? [];
            return (
              <tr key={i.id} className={`hover:bg-gray-50 ${i.id === editId ? "bg-amber-50" : ""}`}>
                <Td className="whitespace-nowrap text-gray-700">{fmtDate(i.date)}</Td>
                <Td className="whitespace-nowrap">
                  {i.student ? (
                    <Link
                      href={`/admin/students/${i.student.id}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {i.student.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                  {i.student && (
                    <span className="ml-2 font-mono text-[11px] text-gray-400">{i.student.student_number}</span>
                  )}
                </Td>
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
                <Td className="max-w-60">
                  <p className="line-clamp-2 text-gray-800" title={i.description}>
                    {i.description}
                  </p>
                </Td>
                <Td className="max-w-60">
                  <p className="line-clamp-2 text-gray-600" title={i.treatment ?? ""}>
                    {i.treatment ?? "—"}
                  </p>
                  {i.hospital && <p className="mt-0.5 text-[11px] text-gray-400">受診: {i.hospital}</p>}
                </Td>
                <Td className="whitespace-nowrap">
                  {related.length === 0 ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {related.map((c) => (
                        <Badge key={c.id} tone={CLAIM_STATUS_TONES[c.status]}>
                          {INSURANCE_CLAIM_STATUS_LABELS[c.status]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/injuries?edit=${i.id}`} className={btnSmall}>
                      編集
                    </Link>
                    <DeleteInjuryButton id={i.id} />
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}

      <SectionTitle>保険申請の受付・処理</SectionTitle>

      {claims.length === 0 ? (
        <EmptyState message="保険申請はまだ届いていません" />
      ) : (
        <Table
          headers={[
            "申請日",
            "生徒",
            "申請者",
            "対象の怪我",
            "保険会社",
            "請求額",
            "事故の概要",
            "状態",
            "職員コメント",
            "操作",
          ]}
        >
          {claims.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <Td className="whitespace-nowrap text-gray-700">{fmtDate(c.created_at)}</Td>
              <Td className="whitespace-nowrap">
                {c.student ? (
                  <Link
                    href={`/admin/students/${c.student.id}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {c.student.name}
                  </Link>
                ) : (
                  "—"
                )}
                {c.student && (
                  <span className="ml-2 font-mono text-[11px] text-gray-400">{c.student.student_number}</span>
                )}
              </Td>
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
              <Td className="whitespace-nowrap text-gray-700">{c.claim_amount == null ? "—" : fmtYen(c.claim_amount)}</Td>
              <Td className="max-w-60">
                <p className="line-clamp-2 text-gray-800" title={c.incident_summary}>
                  {c.incident_summary}
                </p>
              </Td>
              <Td>
                <Badge tone={CLAIM_STATUS_TONES[c.status]}>{INSURANCE_CLAIM_STATUS_LABELS[c.status]}</Badge>
                {c.handled_at && <p className="mt-0.5 text-[11px] text-gray-400">{fmtDateTime(c.handled_at)}</p>}
                {c.paid_at && <p className="mt-0.5 text-[11px] text-gray-400">支払: {fmtDate(c.paid_at)}</p>}
              </Td>
              <Td className="max-w-48">
                {c.staff_comment ? (
                  <p className="line-clamp-3 text-gray-600" title={c.staff_comment}>
                    {c.staff_comment}
                  </p>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </Td>
              <Td>
                <ClaimForm claimId={c.id} currentStatus={c.status} />
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

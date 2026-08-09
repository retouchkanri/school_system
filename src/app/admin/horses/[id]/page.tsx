import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, toDateInput, ageFromBirthDate } from "@/lib/format";
import { HORSE_MOVEMENT_KIND_LABELS, RIDEABILITY_LABELS } from "@/lib/constants";
import {
  Card,
  PageHeader,
  StatCard,
  Badge,
  BackLink,
  InfoRow,
  EmptyState,
  Table,
  Td,
  SectionTitle,
  type BadgeTone,
} from "@/components/ui";
import type {
  Horse,
  Student,
  HorseMovement,
  HorseVaccination,
  HorseFarrierRecord,
  HorseMovementKind,
  RidingReport,
} from "@/lib/types";
import { HorseEditForm } from "../horse-forms";
import {
  fetchRidingStatRows,
  computeHorseRidingStats,
  fmtRideability,
  dueLevel,
  dueLabel,
  dueRowClass,
  RECENT_DAYS,
} from "../horse-stats";
import { MovementForm, VaccinationForm, FarrierForm, DeleteRecordButton } from "./record-forms";

const MOVEMENT_TONES: Record<HorseMovementKind, BadgeTone> = {
  arrival: "green",
  departure: "gray",
  transfer: "blue",
  return: "amber",
};

type ReportWithStudent = RidingReport & { student: Pick<Student, "id" | "name"> | null };

export default async function HorseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const db = adminDb();

  const { data: horseData } = await db.from("horses").select("*").eq("id", id).maybeSingle();
  if (!horseData) notFound();
  const horse = horseData as Horse;

  const [
    statRows,
    { data: movementsData },
    { data: vaccinationsData },
    { data: farrierData },
    { data: studentsData },
    { data: recentData },
    { data: fellOffData },
  ] = await Promise.all([
    fetchRidingStatRows([id]),
    db.from("horse_movements").select("*").eq("horse_id", id).order("date", { ascending: false }),
    db.from("horse_vaccinations").select("*").eq("horse_id", id).order("date", { ascending: false }),
    db.from("horse_farrier_records").select("*").eq("horse_id", id).order("date", { ascending: false }),
    db.from("students").select("*").eq("assigned_horse_id", id).order("student_number", { ascending: true }),
    db
      .from("riding_reports")
      .select("*, student:students(id, name)")
      .eq("horse_id", id)
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
    db
      .from("riding_reports")
      .select("*, student:students(id, name)")
      .eq("horse_id", id)
      .eq("fell_off", true)
      .order("report_date", { ascending: false })
      .limit(10),
  ]);

  const movements = (movementsData ?? []) as HorseMovement[];
  const vaccinations = (vaccinationsData ?? []) as HorseVaccination[];
  const farriers = (farrierData ?? []) as HorseFarrierRecord[];
  const students = (studentsData ?? []) as Student[];
  const recentReports = (recentData ?? []) as ReportWithStudent[];
  const fellOffReports = (fellOffData ?? []) as ReportWithStudent[];

  const stats = computeHorseRidingStats(statRows);
  const today = toDateInput();
  const age = horse.age ?? ageFromBirthDate(horse.birth_date);
  const maxDist = Math.max(1, ...stats.distribution);
  const insuranceLevel = dueLevel(horse.insurance_expires_on, today);

  return (
    <div>
      <BackLink href="/admin/horses" label="馬一覧へ戻る" />

      <PageHeader
        title={horse.name}
        description={[horse.breed, horse.color, horse.sex, horse.stall ? `馬房 ${horse.stall}` : null]
          .filter(Boolean)
          .join(" / ") || "詳細情報は未登録です"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {horse.is_retouch && <Badge tone="purple">リタッチ馬</Badge>}
            <Badge tone={horse.active ? "green" : "gray"}>{horse.active ? "在厩" : "退厩"}</Badge>
          </div>
        }
      />

      {/* ---------- 基本情報 ---------- */}
      <Card title="基本情報" className="mb-6">
        <div className="grid gap-6 md:grid-cols-[10rem_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={horse.photo_url ?? "/images/horse-1.jpg"}
              alt={horse.name}
              className="h-40 w-40 border border-gray-200 object-cover"
            />
          </div>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <InfoRow label="品種" value={horse.breed ?? "—"} />
            <InfoRow label="毛色" value={horse.color ?? "—"} />
            <InfoRow label="性別" value={horse.sex ?? "—"} />
            <InfoRow label="生年月日" value={horse.birth_date ? `${fmtDate(horse.birth_date)}` : "—"} />
            <InfoRow label="年齢" value={age != null ? `${age}歳` : "—"} />
            <InfoRow label="馬房" value={horse.stall ?? "—"} />
            <InfoRow label="マイクロチップ" value={horse.microchip ?? "—"} />
            <InfoRow label="馬主・所有者" value={horse.owner ?? "—"} />
            <InfoRow label="来場日" value={horse.arrived_on ? fmtDate(horse.arrived_on) : "—"} />
            <InfoRow label="退場日" value={horse.departed_on ? fmtDate(horse.departed_on) : "—"} />
            <InfoRow label="保険会社" value={horse.insurance_company ?? "—"} />
            <InfoRow
              label="保険満了日"
              value={
                horse.insurance_expires_on ? (
                  <span className={insuranceLevel === "overdue" || insuranceLevel === "soon" ? "font-semibold text-amber-700" : ""}>
                    {fmtDate(horse.insurance_expires_on)}
                    {(insuranceLevel === "overdue" || insuranceLevel === "soon") && (
                      <span className="ml-1 text-xs">({dueLabel(horse.insurance_expires_on, today)})</span>
                    )}
                  </span>
                ) : (
                  "—"
                )
              }
            />
          </dl>
        </div>

        {horse.notes && (
          <p className="mt-4 whitespace-pre-wrap bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800">
           {horse.notes}
          </p>
        )}

        <details className="mt-4 border-t border-gray-100 pt-4">
          <summary className="cursor-pointer select-none text-sm font-semibold text-brand-600 hover:underline">
           馬の情報を編集する
          </summary>
          <div className="mt-3 border border-gray-100 bg-gray-50 p-4">
            <HorseEditForm horse={horse} />
          </div>
        </details>
      </Card>

      {/* ---------- 騎乗評価サマリ ---------- */}
      <SectionTitle>生徒の騎乗報告から見た評価</SectionTitle>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="騎乗報告数" value={`${stats.total}件`} />
        <StatCard
          label="落馬回数"
          value={`${stats.fellOffCount}回`}
          tone={stats.fellOffCount > 0 ? "danger" : "default"}
          sub={stats.total > 0 ? `報告全体の${Math.round((stats.fellOffCount / stats.total) * 100)}%` : undefined}
        />
        <StatCard
          label="乗りやすさ平均"
          value={fmtRideability(stats.rideabilityAvg)}
          sub={`回答 ${stats.rideabilityCount}件 / 5点満点`}
        />
        <StatCard label={`直近${RECENT_DAYS}日の騎乗`} value={`${stats.recentCount}件`} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card title="乗りやすさの分布">
          {stats.rideabilityCount === 0 ? (
            <EmptyState message="乗りやすさの回答はまだありません" />
          ) : (
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((score) => {
                const count = stats.distribution[score - 1];
                const ratio = stats.rideabilityCount > 0 ? (count / stats.rideabilityCount) * 100 : 0;
                return (
                  <div key={score} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-xs text-gray-600">
                      {score} {RIDEABILITY_LABELS[score]}
                    </span>
                    <div className="h-3 flex-1 bg-gray-100">
                      <div
                        className="h-3 bg-brand-500"
                        style={{ width: `${Math.round((count / maxDist) * 100)}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right text-xs text-gray-500">
                      {count}件 ({Math.round(ratio)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="馬の様子の内訳">
          {stats.moodCounts.length === 0 ? (
            <EmptyState message="馬の様子の回答はまだありません" />
          ) : (
            <ul className="space-y-2">
              {stats.moodCounts.map((m) => (
                <li key={m.mood} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
                  <span className="text-sm text-gray-700">{m.mood}</span>
                  <span className="text-sm font-semibold text-gray-900">{m.count}件</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="落馬があった報告 (最新10件)" className="mb-6">
        {fellOffReports.length === 0 ? (
          <p className="text-sm text-gray-500">落馬の報告はありません</p>
        ) : (
          <ul className="space-y-3">
            {fellOffReports.map((r) => (
              <li key={r.id} className="border border-red-200 bg-red-50 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-red-700">
                  <Badge tone="red">落馬</Badge>
                  <span>{fmtDate(r.report_date)}</span>
                  {r.student && (
                    <Link href={`/admin/students/${r.student.id}`} className="font-semibold hover:underline">
                      {r.student.name}
                    </Link>
                  )}
                  {r.rideability != null && <span>乗りやすさ {r.rideability}</span>}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                  {r.incident?.trim() ? r.incident : "特記事項の記入はありません"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="生徒からの声 (最新10件)" className="mb-6">
        {recentReports.length === 0 ? (
          <EmptyState message="この馬の騎乗報告はまだありません" />
        ) : (
          <ul className="space-y-3">
            {recentReports.map((r) => (
              <li key={r.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>{fmtDate(r.report_date)}</span>
                  {r.student ? (
                    <Link href={`/admin/students/${r.student.id}`} className="font-semibold text-brand-700 hover:underline">
                      {r.student.name}
                    </Link>
                  ) : (
                    <span>—</span>
                  )}
                  {r.lesson && <span>{r.lesson}</span>}
                  {r.rideability != null && (
                    <Badge tone="blue">
                      乗りやすさ {r.rideability} {RIDEABILITY_LABELS[r.rideability] ?? ""}
                    </Badge>
                  )}
                  {r.horse_mood && <Badge tone="gray">{r.horse_mood}</Badge>}
                  {r.fell_off && <Badge tone="red">落馬</Badge>}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{r.content}</p>
                {r.incident?.trim() && (
                  <p className="mt-1 whitespace-pre-wrap bg-amber-50 px-2 py-1 text-xs text-amber-800">
                   {r.incident}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 border-t border-gray-100 pt-3">
          <Link href={`/admin/riding-reports?horse=${horse.id}`} className="text-sm font-semibold text-brand-600 hover:underline">
            この馬の騎乗報告をすべて見る →
          </Link>
        </div>
      </Card>

      {/* ---------- 入退記録 ---------- */}
      <SectionTitle>入退記録</SectionTitle>
      <Card className="mb-6">
        {movements.length === 0 ? (
          <EmptyState message="入退記録はまだありません" />
        ) : (
          <Table headers={["日付", "区分", "相手先", "理由", "備考", "操作"]}>
            {movements.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <Td className="whitespace-nowrap text-gray-600">{fmtDate(m.date)}</Td>
                <Td className="whitespace-nowrap">
                  <Badge tone={MOVEMENT_TONES[m.kind] ?? "gray"}>{HORSE_MOVEMENT_KIND_LABELS[m.kind] ?? m.kind}</Badge>
                </Td>
                <Td className="text-gray-800">{m.counterpart ?? "—"}</Td>
                <Td className="text-gray-600">{m.reason ?? "—"}</Td>
                <Td className="max-w-64">
                  <p className="whitespace-pre-wrap text-gray-600">{m.notes ?? "—"}</p>
                </Td>
                <Td>
                  <DeleteRecordButton
                    record="movement"
                    id={m.id}
                    horseId={horse.id}
                    confirmLabel={`${fmtDate(m.date)} の入退記録`}
                  />
                </Td>
              </tr>
            ))}
          </Table>
        )}
        <details className="mt-4">
          <summary className="cursor-pointer select-none text-sm font-semibold text-brand-600 hover:underline">
            ＋ 入退記録を追加する
          </summary>
          <div className="mt-3 border border-gray-100 bg-gray-50 p-4">
            <MovementForm horseId={horse.id} defaultDate={today} />
          </div>
        </details>
      </Card>

      {/* ---------- 予防接種歴 ---------- */}
      <SectionTitle>予防接種歴</SectionTitle>
      <Card className="mb-6">
        {vaccinations.length === 0 ? (
          <EmptyState message="予防接種歴はまだありません" />
        ) : (
          <Table headers={["接種日", "ワクチン名", "次回予定", "獣医師", "ロット", "備考", "操作"]}>
            {vaccinations.map((v) => {
              const level = dueLevel(v.next_due_date, today);
              return (
                <tr key={v.id} className={dueRowClass(level) || "hover:bg-gray-50"}>
                  <Td className="whitespace-nowrap text-gray-600">{fmtDate(v.date)}</Td>
                  <Td className="whitespace-nowrap font-medium text-gray-800">{v.vaccine_name}</Td>
                  <Td className="whitespace-nowrap">
                    {v.next_due_date ? (
                      <span className={level === "overdue" || level === "soon" ? "font-semibold text-amber-700" : "text-gray-600"}>
                        {fmtDate(v.next_due_date)}
                        <span className="ml-1 text-xs">({dueLabel(v.next_due_date, today)})</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </Td>
                  <Td className="text-gray-600">{v.veterinarian ?? "—"}</Td>
                  <Td className="text-gray-600">{v.lot_number ?? "—"}</Td>
                  <Td className="max-w-56">
                    <p className="whitespace-pre-wrap text-gray-600">{v.notes ?? "—"}</p>
                  </Td>
                  <Td>
                    <DeleteRecordButton
                      record="vaccination"
                      id={v.id}
                      horseId={horse.id}
                      confirmLabel={`${fmtDate(v.date)} の${v.vaccine_name}接種記録`}
                    />
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
        <details className="mt-4">
          <summary className="cursor-pointer select-none text-sm font-semibold text-brand-600 hover:underline">
            ＋ 予防接種歴を追加する
          </summary>
          <div className="mt-3 border border-gray-100 bg-gray-50 p-4">
            <VaccinationForm horseId={horse.id} defaultDate={today} />
          </div>
        </details>
      </Card>

      {/* ---------- 装蹄歴 ---------- */}
      <SectionTitle>装蹄歴</SectionTitle>
      <Card className="mb-6">
        {farriers.length === 0 ? (
          <EmptyState message="装蹄歴はまだありません" />
        ) : (
          <Table headers={["施術日", "種別", "装蹄師", "次回予定", "備考", "操作"]}>
            {farriers.map((f) => {
              const level = dueLevel(f.next_due_date, today);
              return (
                <tr key={f.id} className={dueRowClass(level) || "hover:bg-gray-50"}>
                  <Td className="whitespace-nowrap text-gray-600">{fmtDate(f.date)}</Td>
                  <Td className="whitespace-nowrap text-gray-800">{f.kind ?? "—"}</Td>
                  <Td className="text-gray-600">{f.farrier ?? "—"}</Td>
                  <Td className="whitespace-nowrap">
                    {f.next_due_date ? (
                      <span className={level === "overdue" || level === "soon" ? "font-semibold text-amber-700" : "text-gray-600"}>
                        {fmtDate(f.next_due_date)}
                        <span className="ml-1 text-xs">({dueLabel(f.next_due_date, today)})</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </Td>
                  <Td className="max-w-64">
                    <p className="whitespace-pre-wrap text-gray-600">{f.notes ?? "—"}</p>
                  </Td>
                  <Td>
                    <DeleteRecordButton
                      record="farrier"
                      id={f.id}
                      horseId={horse.id}
                      confirmLabel={`${fmtDate(f.date)} の装蹄記録`}
                    />
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
        <details className="mt-4">
          <summary className="cursor-pointer select-none text-sm font-semibold text-brand-600 hover:underline">
            ＋ 装蹄歴を追加する
          </summary>
          <div className="mt-3 border border-gray-100 bg-gray-50 p-4">
            <FarrierForm horseId={horse.id} defaultDate={today} />
          </div>
        </details>
      </Card>

      {/* ---------- 担当している生徒 ---------- */}
      <SectionTitle>担当している生徒</SectionTitle>
      <Card>
        {students.length === 0 ? (
          <EmptyState message="この馬を担当している生徒はいません" />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {students.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/students/${s.id}`}
                  className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 hover:border-brand-400 hover:text-brand-700"
                >
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-xs text-gray-400">{s.student_number}</span>
                  {s.status !== "enrolled" && <Badge tone="gray">{s.status === "graduated" ? "卒業" : "退学"}</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, toDateInput, ageFromBirthDate } from "@/lib/format";
import {
  PageHeader,
  StatCard,
  Badge,
  EmptyState,
  Table,
  Td,
  Card,
  Field,
  btnSmall,
  btnSecondary,
  inputCls,
} from "@/components/ui";
import type { Horse, Student } from "@/lib/types";
import { HorseCreateForm } from "./horse-forms";
import { toggleRetouchAction } from "./actions";
import {
  fetchRidingStatsByHorse,
  fetchDueInfoByHorse,
  emptyHorseRidingStats,
  emptyHorseDueInfo,
  fmtRideability,
  dueLevel,
  dueLabel,
  isDueAlert,
  DUE_SOON_DAYS,
} from "./horse-stats";

const FILTERS = [
  { value: "all", label: "全て" },
  { value: "active", label: "在厩のみ" },
  { value: "departed", label: "退厩" },
  { value: "retouch", label: "リタッチ馬のみ" },
];

export default async function AdminHorsesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const filter = FILTERS.some((f) => f.value === sp.filter) ? (sp.filter as string) : "all";

  const db = adminDb();
  const [horsesRes, studentsRes] = await Promise.all([
    db.from("horses").select("*").order("name"),
    db.from("students").select("*").not("assigned_horse_id", "is", null).eq("status", "enrolled"),
  ]);
  const horses = (horsesRes.data ?? []) as Horse[];
  const students = (studentsRes.data ?? []) as Student[];

  // N+1 を避けるため、騎乗報告と次回予定は馬ごとに問い合わせず全件まとめて取得し JS 側で集計する
  const [statsByHorse, dueByHorse] = await Promise.all([fetchRidingStatsByHorse(), fetchDueInfoByHorse()]);

  const studentsByHorse = new Map<string, Student[]>();
  for (const s of students) {
    if (!s.assigned_horse_id) continue;
    const list = studentsByHorse.get(s.assigned_horse_id) ?? [];
    list.push(s);
    studentsByHorse.set(s.assigned_horse_id, list);
  }

  const today = toDateInput();

  // 要対応 (予防接種・装蹄の次回予定が超過 or 30日以内)
  const alerts = horses
    .map((h) => {
      const due = dueByHorse.get(h.id) ?? emptyHorseDueInfo();
      const vacLevel = dueLevel(due.vaccinationDue, today);
      const farLevel = dueLevel(due.farrierDue, today);
      return { horse: h, due, vacLevel, farLevel };
    })
    .filter((a) => a.horse.active && (isDueAlert(a.vacLevel) || isDueAlert(a.farLevel)))
    .sort((a, b) => {
      const aDue = [a.vacLevel, a.farLevel].includes("overdue") ? 0 : 1;
      const bDue = [b.vacLevel, b.farLevel].includes("overdue") ? 0 : 1;
      if (aDue !== bDue) return aDue - bDue;
      return a.horse.name.localeCompare(b.horse.name, "ja");
    });

  const activeCount = horses.filter((h) => h.active).length;
  const retouchCount = horses.filter((h) => h.is_retouch).length;

  const keyword = q.toLowerCase();
  const visible = horses.filter((h) => {
    if (filter === "active" && !h.active) return false;
    if (filter === "departed" && h.active) return false;
    if (filter === "retouch" && !h.is_retouch) return false;
    if (!keyword) return true;
    return (
      h.name.toLowerCase().includes(keyword) ||
      (h.stall ?? "").toLowerCase().includes(keyword) ||
      (h.breed ?? "").toLowerCase().includes(keyword) ||
      (h.owner ?? "").toLowerCase().includes(keyword)
    );
  });

  return (
    <div>
      <PageHeader
        title="馬管理"
        description="馬台帳(入退記録・予防接種・装蹄)と、生徒の騎乗報告から集計した馬ごとの評価を管理します"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="総頭数" value={`${horses.length}頭`} />
        <StatCard label="在厩" value={`${activeCount}頭`} sub={`退厩 ${horses.length - activeCount}頭`} />
        <StatCard label="リタッチ馬" value={`${retouchCount}頭`} tone="success" sub="引退馬支援の対象" />
        <StatCard
          label="要対応"
          value={`${alerts.length}頭`}
          tone={alerts.length > 0 ? "warning" : "default"}
          sub={`接種・装蹄の期限超過 / ${DUE_SOON_DAYS}日以内`}
        />
      </div>

      {alerts.length > 0 && (
        <div className="mb-6 border border-amber-300 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-amber-800">
            ⚠ 予防接種・装蹄の予定が近い/超過している馬 ({alerts.length}頭)
          </h2>
          <ul className="mt-3 space-y-2">
            {alerts.slice(0, 20).map((a) => (
              <li key={a.horse.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Link href={`/admin/horses/${a.horse.id}`} className="font-semibold text-brand-700 hover:underline">
                  {a.horse.name}
                </Link>
                {a.horse.stall && <span className="text-xs text-gray-500">馬房 {a.horse.stall}</span>}
                {isDueAlert(a.vacLevel) && (
                  <Badge tone={a.vacLevel === "overdue" ? "red" : "amber"}>
                    予防接種 {fmtDate(a.due.vaccinationDue)} ({dueLabel(a.due.vaccinationDue, today)})
                  </Badge>
                )}
                {isDueAlert(a.farLevel) && (
                  <Badge tone={a.farLevel === "overdue" ? "red" : "amber"}>
                    装蹄 {fmtDate(a.due.farrierDue)} ({dueLabel(a.due.farrierDue, today)})
                  </Badge>
                )}
              </li>
            ))}
          </ul>
          {alerts.length > 20 && (
            <p className="mt-2 text-xs text-amber-700">ほか {alerts.length - 20}頭。詳細は一覧の「接種予定・装蹄予定」列を確認してください。</p>
          )}
        </div>
      )}

      <details className="mb-6 border border-gray-200 bg-white shadow-sm">
        <summary className="cursor-pointer select-none px-5 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50">
          ＋ 新しい馬を登録する
        </summary>
        <div className="border-t border-gray-100 p-5">
          <HorseCreateForm />
        </div>
      </details>

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <Field label="キーワード検索" className="min-w-[14rem] flex-1">
            <input name="q" defaultValue={q} className={inputCls} placeholder="馬名・馬房・品種・馬主で検索" />
          </Field>
          <Field label="絞り込み" className="w-44">
            <select name="filter" defaultValue={filter} className={inputCls}>
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" className={btnSecondary}>
            検索する
          </button>
          {(q || filter !== "all") && (
            <Link href="/admin/horses" className={btnSmall}>
              条件をクリア
            </Link>
          )}
        </form>
      </Card>

      <p className="mb-3 text-xs text-gray-500">
        {visible.length}頭を表示中 (全{horses.length}頭)
      </p>

      {visible.length === 0 ? (
        <EmptyState message="条件に合う馬がいません。検索条件を変えるか、上のフォームから登録してください。" />
      ) : (
        <Table
          headers={[
            "馬名",
            "品種・毛色",
            "年齢",
            "馬房",
            "状態",
            "担当生徒",
            "騎乗報告",
            "落馬",
            "乗りやすさ",
            "接種予定",
            "装蹄予定",
            "操作",
          ]}
        >
          {visible.map((h) => {
            const stats = statsByHorse.get(h.id) ?? emptyHorseRidingStats();
            const due = dueByHorse.get(h.id) ?? emptyHorseDueInfo();
            const vacLevel = dueLevel(due.vaccinationDue, today);
            const farLevel = dueLevel(due.farrierDue, today);
            const assigned = studentsByHorse.get(h.id) ?? [];
            const age = h.age ?? ageFromBirthDate(h.birth_date);
            return (
              <tr key={h.id} className="hover:bg-gray-50">
                <Td className="whitespace-nowrap">
                  <Link href={`/admin/horses/${h.id}`} className="font-semibold text-brand-700 hover:underline">
                    {h.name}
                  </Link>
                  {h.is_retouch && (
                    <span className="ml-1">
                      <Badge tone="purple">リタッチ</Badge>
                    </span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-gray-600">
                  {[h.breed, h.color].filter(Boolean).join(" / ") || "—"}
                </Td>
                <Td className="whitespace-nowrap text-gray-600">{age != null ? `${age}歳` : "—"}</Td>
                <Td className="whitespace-nowrap text-gray-600">{h.stall ?? "—"}</Td>
                <Td className="whitespace-nowrap">
                  <Badge tone={h.active ? "green" : "gray"}>{h.active ? "在厩" : "退厩"}</Badge>
                </Td>
                <Td className="whitespace-nowrap text-gray-600">{assigned.length}名</Td>
                <Td className="whitespace-nowrap text-gray-800">{stats.total}件</Td>
                <Td className="whitespace-nowrap">
                  {stats.fellOffCount > 0 ? (
                    <Badge tone="red">{stats.fellOffCount}回</Badge>
                  ) : (
                    <span className="text-gray-400">0回</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-gray-800">
                  {fmtRideability(stats.rideabilityAvg)}
                  {stats.rideabilityCount > 0 && (
                    <span className="ml-1 text-xs text-gray-400">({stats.rideabilityCount}件)</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  {due.vaccinationDue ? (
                    <span className={isDueAlert(vacLevel) ? "font-semibold text-amber-700" : "text-gray-600"}>
                      {fmtDate(due.vaccinationDue)}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  {due.farrierDue ? (
                    <span className={isDueAlert(farLevel) ? "font-semibold text-amber-700" : "text-gray-600"}>
                      {fmtDate(due.farrierDue)}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/horses/${h.id}`} className={btnSmall}>
                      詳細
                    </Link>
                    <form action={toggleRetouchAction}>
                      <input type="hidden" name="id" value={h.id} />
                      <input type="hidden" name="next" value={h.is_retouch ? "false" : "true"} />
                      <button type="submit" className={btnSmall}>
                        {h.is_retouch ? "リタッチ解除" : "💜 リタッチ"}
                      </button>
                    </form>
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}

import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { PageHeader, StatCard, Badge, EmptyState, btnSmall } from "@/components/ui";
import type { Horse, Student } from "@/lib/types";
import { HorseCreateForm, HorseEditForm } from "./horse-forms";
import { toggleRetouchAction } from "./actions";

export default async function AdminHorsesPage() {
  await requireRole("admin");
  const db = adminDb();

  const [horsesRes, studentsRes] = await Promise.all([
    db.from("horses").select("*").order("name"),
    db.from("students").select("*").not("assigned_horse_id", "is", null),
  ]);
  const horses = (horsesRes.data ?? []) as Horse[];
  const students = (studentsRes.data ?? []) as Student[];

  const studentsByHorse = new Map<string, Student[]>();
  for (const s of students) {
    if (!s.assigned_horse_id) continue;
    const list = studentsByHorse.get(s.assigned_horse_id) ?? [];
    list.push(s);
    studentsByHorse.set(s.assigned_horse_id, list);
  }

  const retouchCount = horses.filter((h) => h.is_retouch).length;

  return (
    <div>
      <PageHeader
        title="馬管理"
        description="学院で飼育している馬の一覧・登録・リタッチ馬(引退馬支援)の設定を行います"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="在籍頭数" value={`${horses.length}頭`} />
        <StatCard label="リタッチ馬" value={`${retouchCount}頭`} tone="success" sub="引退馬支援の対象" />
        <StatCard label="担当生徒" value={`${students.length}名`} sub="担当馬が割り当てられた生徒" />
      </div>

      <details className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
        <summary className="cursor-pointer select-none px-5 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50">
          ＋ 新しい馬を登録する
        </summary>
        <div className="border-t border-gray-100 p-5">
          <HorseCreateForm />
        </div>
      </details>

      {horses.length === 0 ? (
        <EmptyState message="登録されている馬がいません。上のフォームから登録してください。" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {horses.map((h) => {
            const assigned = studentsByHorse.get(h.id) ?? [];
            return (
              <div key={h.id} className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={h.photo_url ?? "/images/horse-1.jpg"}
                      alt={h.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-base font-bold text-gray-900">{h.name}</p>
                      <p className="text-xs text-gray-500">{h.breed ?? "品種未登録"}</p>
                    </div>
                  </div>
                  {h.is_retouch && <Badge tone="purple">リタッチ馬</Badge>}
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-3 text-center">
                  <div>
                    <dt className="text-[11px] text-gray-400">年齢</dt>
                    <dd className="text-sm font-semibold text-gray-800">{h.age != null ? `${h.age}歳` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-gray-400">馬房</dt>
                    <dd className="text-sm font-semibold text-gray-800">{h.stall ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-gray-400">担当生徒</dt>
                    <dd className="text-sm font-semibold text-gray-800">{assigned.length}名</dd>
                  </div>
                </dl>

                {h.notes && (
                  <p className="mt-3 whitespace-pre-wrap rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                    📝 {h.notes}
                  </p>
                )}

                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-gray-400">担当生徒</p>
                  {assigned.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {assigned.map((s) => (
                        <Badge key={s.id} tone="blue">
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-gray-400">担当生徒なし</p>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                  <form action={toggleRetouchAction}>
                    <input type="hidden" name="id" value={h.id} />
                    <input type="hidden" name="next" value={h.is_retouch ? "false" : "true"} />
                    <button type="submit" className={btnSmall}>
                      {h.is_retouch ? "リタッチ解除" : "💜 リタッチ馬にする"}
                    </button>
                  </form>
                </div>

                <details className="mt-2">
                  <summary className="cursor-pointer select-none text-xs font-semibold text-brand-600 hover:underline">
                    ✏️ 編集する
                  </summary>
                  <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <HorseEditForm horse={h} />
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

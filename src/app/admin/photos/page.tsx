import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { PageHeader, Card, Table, Td, Badge, EmptyState, SectionTitle, type BadgeTone } from "@/components/ui";
import { fmtDate, fmtDateTime } from "@/lib/format";
import type { SharedPhoto, Student } from "@/lib/types";
import PhotoShareForm, { type PhotoStudentOption } from "./photo-share-form";
import PhotoRowActions from "./photo-row-actions";
import { PHOTO_AUDIENCE_LABELS, isPhotoAudience, type PhotoAudience } from "./photo-meta";
import { withSignedUrls } from "./shared";

const AUDIENCE_TONES: Record<PhotoAudience, BadgeTone> = {
  student: "green",
  parent: "amber",
  both: "brand",
};

export default async function AdminPhotosPage() {
  await requireRole("admin");

  const [{ data: photoData }, { data: studentData }] = await Promise.all([
    adminDb().from("shared_photos").select("*").order("created_at", { ascending: false }),
    adminDb().from("students").select("*").order("student_number"),
  ]);

  // 送り先の候補は在校生のみ。一覧の氏名表示は卒業生等も引けるよう全件から作る
  const students = (studentData ?? []) as Student[];
  const studentOptions: PhotoStudentOption[] = students
    .filter((s) => s.status === "enrolled")
    .map((s) => ({
      id: s.id,
      name: s.name,
      student_number: s.student_number,
      class_name: s.class_name ?? null,
    }));
  const nameById = new Map(students.map((s) => [s.id, s.name]));

  const photos = await withSignedUrls((photoData ?? []) as SharedPhoto[]);
  const totalFiles = photos.reduce((sum, p) => sum + p.files.length, 0);

  return (
    <div>
      <PageHeader
        title="写真共有"
        description="学校で撮影した写真を在校生本人・保護者へ届けます。公開と同時にメール・LINEでお知らせできます"
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card title="📷 写真を公開">
            <PhotoShareForm students={studentOptions} />
          </Card>
        </div>

        <div className="lg:col-span-3">
          <SectionTitle>
            公開済みの写真({photos.length}件 / 合計{totalFiles}枚)
          </SectionTitle>
          {photos.length === 0 ? (
            <EmptyState message="まだ公開した写真がありません。" />
          ) : (
            <Table headers={["写真", "タイトル・撮影日", "送り先", "公開先", "枚数", "通知", "操作"]}>
              {photos.map((p) => {
                const audience: PhotoAudience = isPhotoAudience(p.audience) ? p.audience : "both";
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <Td>
                      <div className="flex gap-1">
                        {p.urls.slice(0, 3).map((f) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={f.path}
                            src={f.url}
                            alt={p.title}
                            className="h-12 w-12 border border-gray-200 object-cover"
                          />
                        ))}
                        {p.urls.length === 0 && <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </Td>
                    <Td>
                      <p className="text-sm font-semibold text-gray-800">{p.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {p.taken_on ? `撮影 ${fmtDate(p.taken_on)}` : "撮影日未設定"} / 公開 {fmtDateTime(p.created_at)}
                      </p>
                      {p.description && (
                        <p className="mt-0.5 max-w-xs text-xs text-gray-500">
                          {p.description.length > 60 ? `${p.description.slice(0, 60)}…` : p.description}
                        </p>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-sm text-gray-700">
                      {p.student_id ? nameById.get(p.student_id) ?? "(不明)" : "全員"}
                    </Td>
                    <Td className="whitespace-nowrap">
                      <Badge tone={AUDIENCE_TONES[audience]}>{PHOTO_AUDIENCE_LABELS[audience]}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap text-sm text-gray-700">{p.files.length}枚</Td>
                    <Td className="whitespace-nowrap text-xs text-gray-500">
                      {p.notified_at ? fmtDateTime(p.notified_at) : "未通知"}
                    </Td>
                    <Td>
                      <PhotoRowActions id={p.id} notified={!!p.notified_at} />
                    </Td>
                  </tr>
                );
              })}
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

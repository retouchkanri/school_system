import { requireRole } from "@/lib/auth";
import { getStudentsForParent } from "@/lib/data";
import { Section, PageHeader, EmptyState, SectionTitle } from "@/components/ui";
import PhotoGallery from "@/app/admin/photos/photo-gallery";
import { loadPhotosForStudent, type SharedPhotoWithUrls } from "@/app/admin/photos/shared";
import type { Student } from "@/lib/types";

export default async function ParentPhotosPage() {
  const profile = await requireRole("parent");
  const children = await getStudentsForParent(profile.id);

  if (children.length === 0) {
    return (
      <div>
        <PageHeader title="写真" description="学校で撮影したお子様の写真が届きます" />
        <Section>
          <EmptyState message="お子様の情報が登録されていません。学校へお問い合わせください。" />
        </Section>
      </div>
    );
  }

  const sections: { student: Student; photos: SharedPhotoWithUrls[] }[] = await Promise.all(
    children.map(async (student) => ({
      student,
      photos: await loadPhotosForStudent(student.id, "parent"),
    }))
  );
  const totalFiles = sections.reduce(
    (sum, s) => sum + s.photos.reduce((n, p) => n + p.urls.length, 0),
    0
  );

  return (
    <div>
      <PageHeader
        title="写真"
        description={
          totalFiles > 0
            ? `学校で撮影した写真が${totalFiles}枚届いています。画像をクリックすると拡大表示、「保存」でダウンロードできます`
            : "学校で撮影したお子様の写真が届きます"
        }
      />

      <div className="space-y-8">
        {sections.map(({ student, photos }) => (
          <section key={student.id}>
            <SectionTitle>
              {student.name}さん({student.student_number}
              {student.class_name ? ` / ${student.class_name}` : ""})
            </SectionTitle>
            <PhotoGallery photos={photos} emptyMessage={`${student.name}さん宛の写真はまだ届いていません`} />
          </section>
        ))}
      </div>
    </div>
  );
}

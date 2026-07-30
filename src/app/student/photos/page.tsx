import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import PhotoGallery from "@/app/admin/photos/photo-gallery";
import { loadPhotosForStudent } from "@/app/admin/photos/shared";

export default async function StudentPhotosPage() {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);

  if (!student) {
    return (
      <div>
        <PageHeader title="写真" description="学校で撮影した写真が届きます" />
        <Card>
          <EmptyState message="生徒情報が登録されていません。学校へお問い合わせください。" />
        </Card>
      </div>
    );
  }

  const photos = await loadPhotosForStudent(student.id, "student");
  const totalFiles = photos.reduce((sum, p) => sum + p.urls.length, 0);

  return (
    <div>
      <PageHeader
        title="写真"
        description={
          photos.length > 0
            ? `学校で撮影した写真が${photos.length}件(${totalFiles}枚)届いています。画像をクリックすると拡大表示、「保存」でダウンロードできます`
            : "学校で撮影した写真が届きます"
        }
      />
      <PhotoGallery photos={photos} />
    </div>
  );
}

import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDateTime } from "@/lib/format";
import { AUDIENCE_LABELS } from "@/lib/constants";
import { Card, PageHeader, EmptyState, Badge } from "@/components/ui";
import type { Announcement } from "@/lib/types";

export default async function StudentAnnouncementsPage() {
  await requireRole("student");

  const { data } = await adminDb()
    .from("announcements")
    .select("*")
    .in("audience", ["student", "all"])
    .order("published_at", { ascending: false });

  const announcements = (data ?? []) as Announcement[];

  return (
    <div>
      <PageHeader title="お知らせ" description="学校からのお知らせ一覧です" />

      {announcements.length === 0 ? (
        <Card>
          <EmptyState message="お知らせはまだありません" />
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{a.title}</h3>
                  <p className="mt-0.5 text-xs text-gray-400">{fmtDateTime(a.published_at)}</p>
                </div>
                <Badge tone={a.audience === "all" ? "gray" : "brand"}>{AUDIENCE_LABELS[a.audience]}</Badge>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{a.body}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

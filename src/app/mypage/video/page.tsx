import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLeadForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { VIDEO_STATUS_LABELS } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { Section, PageHeader, Badge, InfoRow, btnPrimary, type BadgeTone } from "@/components/ui";
import type { VideoProgress, VideoStatus } from "@/lib/types";
import VideoPlayer from "./video-player";

const VIDEO_TITLE = "学院紹介動画";

const STATUS_TONE: Record<VideoStatus, BadgeTone> = {
  unwatched: "gray",
  in_progress: "amber",
  completed: "green",
};

export default async function VideoPage() {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);

  if (!lead) {
    return (
      <div>
        <PageHeader title="学院紹介動画" />
        <Section>
          <div className="py-6 text-center">
            <p className="mt-3 text-sm font-bold text-gray-800">資料請求がまだ紐づいていません</p>
            <p className="mt-2 text-sm text-gray-500">まずは資料請求フォームからお申し込みください。</p>
            <Link href="/request" className={`${btnPrimary} mt-5`}>
              資料請求フォームへ
            </Link>
          </div>
        </Section>
      </div>
    );
  }

  const { data } = await adminDb()
    .from("video_progress")
    .select("*")
    .eq("lead_id", lead.id)
    .eq("video_title", VIDEO_TITLE)
    .maybeSingle();
  const progress = (data as VideoProgress | null) ?? null;
  const status: VideoStatus = progress?.status ?? "unwatched";

  return (
    <div>
      <PageHeader
        title="学院紹介動画"
        description="学院の雰囲気・寮生活・実習の様子をご覧いただけます"
        action={<Badge tone={STATUS_TONE[status]}>{VIDEO_STATUS_LABELS[status]}</Badge>}
      />

      <VideoPlayer initialCompleted={status === "completed"} />

      <Section title="視聴状況" className="mt-6">
        <dl>
          <InfoRow label="動画タイトル" value={VIDEO_TITLE} />
          <InfoRow label="視聴状況" value={<Badge tone={STATUS_TONE[status]}>{VIDEO_STATUS_LABELS[status]}</Badge>} />
          <InfoRow label="進捗" value={`${progress?.progress_percent ?? 0}%`} />
          <InfoRow label="最終更新" value={progress ? fmtDateTime(progress.updated_at) : "—"} />
        </dl>
      </Section>
    </div>
  );
}

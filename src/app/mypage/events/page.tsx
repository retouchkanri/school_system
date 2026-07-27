import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLeadForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  BANK_TRANSFER_INFO,
  AI_JUDGEMENT_LABELS,
  AI_JUDGEMENT_MESSAGES,
  EXPERIENCE_APPLICATION_URLS,
} from "@/lib/constants";
import { fmtDate, fmtYen, toDateInput } from "@/lib/format";
import { Card, PageHeader, Badge, EmptyState, Table, Td, SectionTitle, btnPrimary, btnSecondary, btnSmall, type BadgeTone } from "@/components/ui";
import type { BookingStatus, OpenCampusBooking, OpenCampusEvent, PaymentStatus } from "@/lib/types";
import BookingForm from "./booking-form";
import { cancelBookingAction, requestIndividualConsultationAction } from "./actions";
import { isDevPhase, skipPaymentInDev } from "@/lib/dev";

type BookingRow = OpenCampusBooking & { open_campus_events: OpenCampusEvent | null };

const BOOKING_TONE: Record<BookingStatus, BadgeTone> = {
  reserved: "blue",
  attended: "green",
  cancelled: "gray",
  no_show: "red",
};

const PAYMENT_TONE: Record<PaymentStatus, BadgeTone> = {
  pending: "amber",
  paid: "blue",
  confirmed: "green",
  refunded: "gray",
  cancelled: "gray",
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string }>;
}) {
  const profile = await requireRole("applicant");
  const sp = await searchParams;
  const lead = await getLeadForUser(profile.id);

  if (!lead) {
    return (
      <div>
        <PageHeader title="見学・オープンキャンパス予約" />
        <Card>
          <div className="py-6 text-center">
            <p className="mt-3 text-sm font-bold text-gray-800">資料請求がまだ紐づいていません</p>
            <p className="mt-2 text-sm text-gray-500">まずは資料請求フォームからお申し込みください。</p>
            <Link href="/request" className={`${btnPrimary} mt-5`}>
              資料請求フォームへ
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // AI判定前 → 仮審査への誘導 (開発フェーズ中はスキップ可)
  if (!lead.ai_judgement && !isDevPhase()) {
    return (
      <div>
        <PageHeader title="見学・オープンキャンパス予約" />
        <Card>
          <div className="py-6 text-center">
            <p className="mt-3 text-sm font-bold text-gray-800">まずは入学仮審査アンケートにご回答ください</p>
            <p className="mt-2 text-sm text-gray-500">
              仮審査の完了後、見学・オープンキャンパスのご予約が可能になります。
            </p>
            <Link href="/mypage/survey" className={`${btnPrimary} mt-5`}>
              仮審査アンケートへ →
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const courseUrl = lead.desired_course ? EXPERIENCE_APPLICATION_URLS[lead.desired_course] : null;

  const today = toDateInput();
  const [{ data: eventsData }, { data: bookingsData }] = await Promise.all([
    adminDb().from("open_campus_events").select("*").gte("event_date", today).order("event_date", { ascending: true }),
    adminDb()
      .from("open_campus_bookings")
      .select("*, open_campus_events(*)")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false }),
  ]);
  const events = ((eventsData as OpenCampusEvent[] | null) ?? []).slice();
  const bookings = ((bookingsData as BookingRow[] | null) ?? []).slice();
  const activeBookingEventIds = new Set(bookings.filter((b) => b.status !== "cancelled").map((b) => b.event_id));
  const hasPendingBank = bookings.some(
    (b) => b.status !== "cancelled" && b.payment_method === "bank_transfer" && b.payment_status === "pending"
  );

  return (
    <div>
      <PageHeader
        title="見学・オープンキャンパス仮予約"
        description="実際に馬と触れ合い、学院の一日を体験してください。仮予約後、参加費のご入金をもって参加確定となります。"
      />

      {sp.stripe === "success" && (
        <div className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✓ カード決済が完了しました。入金の反映まで少々お待ちください(確認メールをお送りしています)。
        </div>
      )}
      {sp.stripe === "cancel" && (
        <div className="mb-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          カード決済がキャンセルされました。お支払いは完了していません。あらためて決済いただくか、銀行振込をご利用ください。
        </div>
      )}

      {lead.ai_judgement ? (
        <div className="mb-6 border border-brand-200 bg-brand-50 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{AI_JUDGEMENT_LABELS[lead.ai_judgement]}</Badge>
            <p className="text-sm font-bold text-gray-800">{AI_JUDGEMENT_MESSAGES[lead.ai_judgement]}</p>
          </div>
          {lead.ai_judgement === "rejected" && (
            <form action={requestIndividualConsultationAction} className="mt-3">
              <button type="submit" className={btnSecondary}>
                個別相談を希望する
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="mb-4 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          開発モード: 仮審査未完了でも見学予約・決済スキップが利用できます
        </div>
      )}

      {courseUrl && (
        <Card title="体験入学のお申し込みについて" className="mb-6">
          <p className="text-sm text-gray-600">
            体験入学(お試し入学)は下記の専用フォームからもお申し込みいただけます。
          </p>
          <a href={courseUrl} target="_blank" rel="noopener noreferrer" className={`${btnSecondary} mt-3`}>
            体験入学申込フォームを開く →
          </a>
        </Card>
      )}

      <SectionTitle>開催予定のイベント</SectionTitle>
      <p className="mb-3 text-xs text-gray-400">
        ※ 参加費は開発中の仮価格です。正式なものではなく、今後変更になる場合があります。
      </p>
      {events.length === 0 ? (
        <EmptyState message="現在募集中のイベントはありません。次回の開催をお待ちください。" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((ev) => (
            <Card key={ev.id}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-900">{ev.title}</h3>
                {activeBookingEventIds.has(ev.id) && <Badge tone="blue">仮予約済</Badge>}
              </div>
              <dl className="mt-3 space-y-1 text-sm text-gray-700">
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-xs font-semibold leading-5 text-gray-500">日時</dt>
                  <dd>
                    {fmtDate(ev.event_date)} {ev.start_time ?? ""}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-xs font-semibold leading-5 text-gray-500">定員</dt>
                  <dd>{ev.capacity}名</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-xs font-semibold leading-5 text-gray-500">参加費</dt>
                  <dd className="font-semibold">{fmtYen(ev.fee)}</dd>
                </div>
              </dl>
              {ev.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{ev.description}</p>
              )}
              {!activeBookingEventIds.has(ev.id) && <BookingForm eventId={ev.id} skipPayment={skipPaymentInDev()} />}
            </Card>
          ))}
        </div>
      )}

      <SectionTitle>あなたの予約</SectionTitle>
      {bookings.length === 0 ? (
        <EmptyState message="まだ予約はありません" />
      ) : (
        <Table headers={["イベント", "日程", "決済方法", "決済状況", "参加状況", ""]}>
          {bookings.map((b) => (
            <tr key={b.id} className="hover:bg-gray-50">
              <Td className="font-medium text-gray-900">{b.open_campus_events?.title ?? "—"}</Td>
              <Td>{b.open_campus_events ? fmtDate(b.open_campus_events.event_date) : "—"}</Td>
              <Td>{b.payment_method ? PAYMENT_METHOD_LABELS[b.payment_method] : "—"}</Td>
              <Td>
                <Badge tone={PAYMENT_TONE[b.payment_status]}>{PAYMENT_STATUS_LABELS[b.payment_status]}</Badge>
              </Td>
              <Td>
                <Badge tone={BOOKING_TONE[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge>
              </Td>
              <Td>
                {b.status === "reserved" && (
                  <form action={cancelBookingAction}>
                    <input type="hidden" name="booking_id" value={b.id} />
                    <button type="submit" className={btnSmall}>
                      キャンセル
                    </button>
                  </form>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      {hasPendingBank && (
        <div className="mt-4 border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <p className="font-bold">お振込のご案内 (銀行振込を選択された方)</p>
          <p className="mt-1">下記口座へ参加費のお振込をお願いいたします。入金確認をもって参加確定となります。</p>
          <p className="mt-2 rounded bg-white px-3 py-2 font-semibold">{BANK_TRANSFER_INFO}</p>
        </div>
      )}
    </div>
  );
}

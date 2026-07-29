import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, fmtYen } from "@/lib/format";
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/constants";
import { Card, PageHeader, EmptyState, Badge, Table, Td, btnSmall, type BadgeTone } from "@/components/ui";
import type { OpenCampusBooking, OpenCampusEvent } from "@/lib/types";
import EventForm from "./event-form";
import { confirmBankTransferAction, markAttendedAction, cancelBookingAction } from "./actions";

type BookingRow = OpenCampusBooking & { leads: { name: string } | null };

const PAYMENT_TONES: Record<OpenCampusBooking["payment_status"], BadgeTone> = {
  pending: "amber",
  paid: "blue",
  confirmed: "green",
  refunded: "gray",
  cancelled: "gray",
};

const BOOKING_TONES: Record<OpenCampusBooking["status"], BadgeTone> = {
  reserved: "blue",
  attended: "green",
  cancelled: "gray",
  no_show: "red",
};

export default async function AdminEventsPage() {
  await requireRole("admin");
  const db = adminDb();

  const [{ data: eventsData }, { data: bookingsData }] = await Promise.all([
    db.from("open_campus_events").select("*").order("event_date", { ascending: false }),
    db
      .from("open_campus_bookings")
      .select("*, leads(name)")
      .order("created_at", { ascending: true }),
  ]);
  const events = (eventsData ?? []) as OpenCampusEvent[];
  const bookings = (bookingsData ?? []) as BookingRow[];

  const bookingsByEvent = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const list = bookingsByEvent.get(b.event_id) ?? [];
    list.push(b);
    bookingsByEvent.set(b.event_id, list);
  }

  return (
    <div>
      <PageHeader
        title="見学・オープンキャンパス管理"
        description="イベントの作成、予約者の入金確認・参加管理を行います"
      />

      <Card title="新規イベント作成" className="mb-8">
        <EventForm />
      </Card>

      {events.length === 0 ? (
        <EmptyState message="イベントがまだ登録されていません" />
      ) : (
        <div className="space-y-6">
          {events.map((event) => {
            const eventBookings = bookingsByEvent.get(event.id) ?? [];
            const activeCount = eventBookings.filter((b) => b.status !== "cancelled").length;
            return (
              <Card
                key={event.id}
                title={`${fmtDate(event.event_date)} ${event.title}`}
                action={
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {event.start_time && <span>🕙 {event.start_time} 開始</span>}
                    <span>
                      予約 <span className="font-bold text-gray-700">{activeCount}</span> / 定員 {event.capacity}名
                    </span>
                    <Badge tone="brand">参加費 {fmtYen(event.fee)}</Badge>
                  </div>
                }
              >
                {event.description && (
                  <p className="mb-4 whitespace-pre-wrap bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    {event.description}
                  </p>
                )}
                {eventBookings.length === 0 ? (
                  <EmptyState message="まだ予約がありません" />
                ) : (
                  <Table headers={["氏名", "決済方法", "決済状況", "参加状況", "操作"]}>
                    {eventBookings.map((b) => {
                      const canConfirmTransfer =
                        b.payment_method === "bank_transfer" &&
                        (b.payment_status === "pending" || b.payment_status === "paid") &&
                        b.status !== "cancelled";
                      return (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <Td className="font-medium text-gray-900">{b.leads?.name ?? "—"}</Td>
                          <Td className="text-gray-600">
                            {b.payment_method ? PAYMENT_METHOD_LABELS[b.payment_method] : "—"}
                          </Td>
                          <Td>
                            <Badge tone={PAYMENT_TONES[b.payment_status]}>
                              {PAYMENT_STATUS_LABELS[b.payment_status]}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge tone={BOOKING_TONES[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge>
                          </Td>
                          <Td>
                            <div className="flex flex-wrap items-center gap-2">
                              {canConfirmTransfer && (
                                <form action={confirmBankTransferAction}>
                                  <input type="hidden" name="booking_id" value={b.id} />
                                  <button className={`${btnSmall} border-emerald-300 text-emerald-700 hover:bg-emerald-50`}>
                                    銀行振込を確認
                                  </button>
                                </form>
                              )}
                              {b.status === "reserved" && (
                                <form action={markAttendedAction}>
                                  <input type="hidden" name="booking_id" value={b.id} />
                                  <button className={`${btnSmall} border-brand-300 text-brand-700 hover:bg-brand-50`}>
                                    参加済にする
                                  </button>
                                </form>
                              )}
                              {b.status === "reserved" && (
                                <form action={cancelBookingAction}>
                                  <input type="hidden" name="booking_id" value={b.id} />
                                  <button className={`${btnSmall} border-red-200 text-red-600 hover:bg-red-50`}>
                                    キャンセル
                                  </button>
                                </form>
                              )}
                              {b.status !== "reserved" && !canConfirmTransfer && (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </div>
                          </Td>
                        </tr>
                      );
                    })}
                  </Table>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

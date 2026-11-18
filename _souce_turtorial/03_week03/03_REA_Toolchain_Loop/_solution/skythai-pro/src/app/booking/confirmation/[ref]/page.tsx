import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingSummary } from "@/components/BookingSummary";
import { getBooking } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  if (!/^[A-Za-z0-9]{6}$/.test(ref)) notFound();
  const b = await getBooking(ref);
  if (!b) notFound();
  return (
    <div className="container" style={{ paddingTop: 20 }}>
      <div className="card" style={{ textAlign: "center" }} data-testid="confirmation">
        <div style={{ fontSize: 40 }}>🌸✈️</div>
        <h1 style={{ color: "var(--navy)", margin: "6px 0" }}>จองสำเร็จ (จำลอง)</h1>
        <div className="sub">รหัสการจองของคุณ</div>
        <div className="ref-code" data-testid="booking-ref">{b.booking_ref}</div>
        <div className="sub">สถานะ: <span data-testid="booking-status">{b.status}</span> · ไม่มีการชำระเงินและไม่มีการส่งอีเมลจริง</div>
      </div>
      <BookingSummary b={b} />
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <Link href="/" className="btn-secondary" data-testid="new-search">ค้นหาเที่ยวบินใหม่</Link>
      </div>
    </div>
  );
}

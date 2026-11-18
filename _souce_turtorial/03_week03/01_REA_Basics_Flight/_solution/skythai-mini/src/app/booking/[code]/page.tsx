import Link from "next/link";
import { notFound } from "next/navigation";
import FlightSummary from "@/components/FlightSummary";
import { getBooking } from "@/lib/db";
import { thaiDate, thaiDateTime, thb } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BookingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const b = /^STM-[A-Z0-9]{6}$/.test(code) ? await getBooking(code) : null;
  if (!b) notFound();
  const f = b.flight;

  return (
    <>
      <section className="success" data-testid="booking-success">
        <div className="check" aria-hidden>✓</div>
        <h1>จองสำเร็จ!</h1>
        <p>รหัสการจองของคุณ</p>
        <div className="code" data-testid="booking-code">{b.booking_code}</div>
        <p className="muted">สถานะ: ยืนยันแล้ว (เดโม — ไม่มีการชำระเงินจริง)</p>
      </section>
      <section className="panel" data-testid="booking-summary">
        <div className="panel-head">
          <strong>{f.airline}</strong>
          <span>{thaiDate(f.flight_date)} · เที่ยวเดียว</span>
        </div>
        <FlightSummary f={f} />
        <dl className="kv">
          <dt>ผู้โดยสาร</dt><dd data-testid="summary-name">{b.passenger_name}</dd>
          <dt>อีเมล</dt><dd data-testid="summary-email">{b.email}</dd>
          <dt>จำนวน</dt><dd>ผู้ใหญ่ {b.passengers} คน</dd>
          <dt>ยอดรวม</dt><dd data-testid="summary-total">{thb(b.total_thb)}</dd>
          <dt>จองเมื่อ</dt><dd>{thaiDateTime(b.created_at)} น.</dd>
        </dl>
      </section>
      <Link href="/" className="btn" data-testid="new-search">ค้นหาเที่ยวบินอื่น</Link>
    </>
  );
}

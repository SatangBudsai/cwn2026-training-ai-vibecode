import Link from "next/link";
import { notFound } from "next/navigation";
import FlightSummary from "@/components/FlightSummary";
import BookingForm from "@/components/BookingForm";
import { getFlight } from "@/lib/db";
import { thaiDate, thb } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const flightId = Number(id);
  const f = Number.isInteger(flightId) && flightId > 0 ? await getFlight(flightId) : null;
  if (!f) notFound();

  return (
    <>
      <Link href="/" className="back" data-testid="back-to-results">← กลับไปผลการค้นหา</Link>
      <h1 className="page-title">กรอกข้อมูลผู้โดยสาร</h1>
      <section className="panel" data-testid="selected-flight">
        <div className="panel-head">
          <strong data-testid="flight-airline">{f.airline}</strong>
          <span>{thaiDate(f.flight_date)} · เที่ยวเดียว · ผู้ใหญ่ 1 คน</span>
        </div>
        <FlightSummary f={f} />
        <div className="total">ราคารวม <b data-testid="flight-price">{thb(f.price_thb)}</b></div>
      </section>
      <BookingForm flightId={f.id} priceText={thb(f.price_thb)} />
    </>
  );
}

import { MockNotice } from "./MockNotice";
import { FlightDetail } from "./FlightRow";
import { fmtDateTimeTH, fmtDuration, fmtLong } from "@/lib/dates";
import { baht } from "@/lib/format";
import { getFlights } from "@/lib/flights";
import { cabinLabel, paxLabel } from "@/lib/passengers";
import { shiftFor, type BookingRow } from "@/lib/bookings";

export async function BookingSummary({ b }: { b: BookingRow }) {
  const [f] = await getFlights({ ids: [b.flight_id], shiftDays: shiftFor(b.travel_date, b.snapshot_date) });
  const pax = { adults: b.adults, children: b.children, infantsSeat: b.infants_seat, infantsLap: b.infants_lap };
  return (
    <>
      <MockNotice capturedAt={new Date(b.data_captured_at).toISOString()} snapshotDate={b.snapshot_date} searchDate={b.travel_date} />
      <div className="two-col">
        <div className="card" data-testid="booking-flight">
          <h3>เที่ยวบิน · {fmtLong(b.travel_date)}</h3>
          {f && (
            <>
              <div className="times">{f.departTime} {f.origin} – {f.arriveTime}{f.dayOffset > 0 && <sup>+{f.dayOffset}</sup>} {f.destination}</div>
              <div className="sub">{f.airlines.map((a) => a.name).join(", ")} · {f.legs.map((l) => l.flightNumber).join(", ")} · {fmtDuration(f.durationMin)}</div>
              <FlightDetail f={f} />
            </>
          )}
        </div>
        <div className="card" data-testid="booking-details">
          <h3>รายละเอียดการจอง</h3>
          <div className="summary-line"><span>ผู้ติดต่อ</span><b data-testid="summary-name">{b.contact_name}</b></div>
          <div className="summary-line"><span>อีเมล</span><b data-testid="summary-email">{b.contact_email}</b></div>
          <div className="summary-line"><span>ผู้โดยสาร</span><span>{paxLabel(pax)}</span></div>
          <div className="summary-line"><span>ชั้นโดยสาร</span><span>{cabinLabel(b.cabin)} · เที่ยวเดียว</span></div>
          <div className="summary-line"><span>ค่าโดยสารต่อที่นั่ง</span><span>{baht(b.price_per_seat)}</span></div>
          <div className="summary-line total"><span>ราคารวม (ไม่ได้เรียกเก็บ)</span><span data-testid="summary-total">{baht(b.total_price_thb)}</span></div>
          <p className="sub">บันทึกเมื่อ {fmtDateTimeTH(b.created_at)} · ข้อมูลราคา ณ {fmtDateTimeTH(b.data_captured_at)}</p>
        </div>
      </div>
    </>
  );
}

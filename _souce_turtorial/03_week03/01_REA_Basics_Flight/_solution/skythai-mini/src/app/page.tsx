import Link from "next/link";
import FlightSummary from "@/components/FlightSummary";
import { listFlights, SORTS, type SortKey } from "@/lib/db";
import { thaiDate, thaiDateTime, thb } from "@/lib/format";

export const dynamic = "force-dynamic";

/** วันที่ 15 ของเดือนหน้า ตามเวลาไทย (YYYY-MM-DD) */
function fifteenthOfNextMonth(): string {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" })
    .format(new Date()).split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-15`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; nonstop?: string }>;
}) {
  const sp = await searchParams;
  const sort: SortKey = sp.sort && sp.sort in SORTS ? (sp.sort as SortKey) : "price_asc";
  const nonstop = sp.nonstop === "1";
  const flights = await listFlights(sort, nonstop);
  const flightDate = flights[0]?.flight_date;
  const capturedAt = flights[0]?.captured_at;
  const wanted = fifteenthOfNextMonth();

  const href = (s: SortKey, n: boolean) => `/?sort=${s}${n ? "&nonstop=1" : ""}`;

  return (
    <>
      <section className="hero" data-testid="hero">
        <img src="/hero.png" alt="ภาพประกอบการเดินทางไปญี่ปุ่น" className="hero-img" data-testid="hero-image" />
        <div className="hero-text">
          <h1>บินไปญี่ปุ่นกับ SkyThai Mini</h1>
          <p>เทียบเที่ยวบินกรุงเทพ → โตเกียว แล้วจองได้ในไม่กี่คลิก</p>
        </div>
      </section>

      <section className="search-card" data-testid="search-summary">
        <div><label>ต้นทาง</label><strong data-testid="search-origin">กรุงเทพฯ (BKK / DMK)</strong></div>
        <div><label>ปลายทาง</label><strong data-testid="search-destination">ญี่ปุ่น · โตเกียว (NRT / HND)</strong></div>
        <div><label>วันเดินทาง</label><strong data-testid="search-date">{flightDate ? thaiDate(flightDate) : "-"}</strong></div>
        <div><label>ประเภท</label><strong data-testid="search-trip-type">เที่ยวเดียว</strong></div>
        <div><label>ผู้โดยสาร</label><strong data-testid="search-passengers">ผู้ใหญ่ 1 คน · ชั้นประหยัด</strong></div>
      </section>

      <div className="notice" role="note" data-testid="mock-data-notice">
        <b>ข้อมูลจำลอง</b> — ราคาและตารางบินเป็นภาพรวม ณ วันที่เก็บข้อมูล{" "}
        <span data-testid="captured-at">{capturedAt ? thaiDateTime(capturedAt) : "-"}</span> น. (เวลาไทย)
        ราคาเริ่มต้นต่อผู้ใหญ่ 1 คน รวมภาษี ไม่รวมสัมภาระ และอาจไม่ตรงกับราคาปัจจุบัน
        {flightDate && flightDate !== wanted && (
          <> · หมายเหตุ: วันที่ 15 ของเดือนหน้าตอนนี้คือ {thaiDate(wanted)} แต่ข้อมูลที่มีเป็นของวันเดินทาง {thaiDate(flightDate)}</>
        )}
      </div>

      <div className="toolbar" data-testid="sort-bar">
        <span className="count" data-testid="result-count">พบ {flights.length} เที่ยวบิน</span>
        <nav className="sorts">
          {(Object.keys(SORTS) as SortKey[]).map((k) => (
            <Link key={k} href={href(k, nonstop)} className={k === sort ? "chip active" : "chip"}
              data-testid={`sort-${k}`} aria-current={k === sort ? "true" : undefined}>
              {SORTS[k].label}
            </Link>
          ))}
          <Link href={href(sort, !nonstop)} className={nonstop ? "chip active" : "chip"} data-testid="filter-nonstop">
            {nonstop ? "✓ " : ""}บินตรงเท่านั้น
          </Link>
        </nav>
      </div>

      <ul className="flight-list" data-testid="flight-list">
        {flights.map((f, i) => (
          <li key={f.id} className="flight-card" data-testid="flight-card" data-flight-id={f.id} data-price={f.price_thb}>
            <div className="airline">
              <div className="badge" aria-hidden>{f.airline.slice(0, 1)}</div>
              <div>
                <div className="name" data-testid="flight-airline">{f.airline}</div>
                {f.operated_by && <div className="op">ให้บริการโดย {f.operated_by}</div>}
                {i === 0 && sort === "price_asc" && <span className="tag">ถูกสุด</span>}
              </div>
            </div>
            <FlightSummary f={f} />
            <div className="buy">
              <div className="price" data-testid="flight-price">{thb(f.price_thb)}</div>
              <div className="per">ต่อผู้ใหญ่ 1 คน</div>
              <Link href={`/book/${f.id}`} className="btn" data-testid="select-flight">เลือก</Link>
            </div>
          </li>
        ))}
      </ul>
      {flights.length === 0 && <p data-testid="empty-state">ไม่พบเที่ยวบินตามเงื่อนไข</p>}
    </>
  );
}

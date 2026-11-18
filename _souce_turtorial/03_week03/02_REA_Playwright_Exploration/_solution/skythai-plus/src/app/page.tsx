import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { MockNotice } from "@/components/MockNotice";
import { getSnapshot } from "@/lib/flights";
import { q } from "@/lib/db";
import { todayISO } from "@/lib/dates";
import { baht } from "@/lib/format";
import { defaultSearch, searchQuery } from "@/lib/search";

export const dynamic = "force-dynamic";

const FAQ = [
  ["ข้อมูลเที่ยวบินในเว็บนี้มาจากไหน", "เป็นข้อมูลจำลองที่เก็บไว้เมื่อ 31 ต.ค. 2026 สำหรับเที่ยวบินกรุงเทพ → โตเกียว (22 เที่ยวบิน) ใช้สาธิตการทำงานของระบบเท่านั้น"],
  ["จองแล้วต้องจ่ายเงินไหม", "ไม่ต้อง ระบบบันทึกการจองลงฐานข้อมูลและออกรหัสจองจำลองให้ ไม่มีการตัดเงินหรือออกตั๋วจริง"],
  ["ราคาที่แสดงรวมอะไรบ้าง", "ราคารวมภาษีและค่าธรรมเนียมต่อผู้โดยสารที่มีที่นั่ง 1 ท่าน อาจมีค่าสัมภาระหรือค่าบริการอื่นเพิ่มเติม (กฎ C9)"],
  ["เวลาที่แสดงเป็นเวลาของที่ไหน", "เวลาออกเป็นเวลาท้องถิ่นของสนามบินต้นทาง และเวลาถึงเป็นเวลาท้องถิ่นของสนามบินปลายทาง ญี่ปุ่นเร็วกว่าไทย 2 ชั่วโมง"],
];

export default async function Home() {
  const today = todayISO();
  const initial = defaultSearch(today);
  let snap = null;
  let deals: { destination: string; city: string | null; min: number; n: number }[] = [];
  try {
    snap = await getSnapshot();
    deals = await q(
      `SELECT f.destination, a.city_th AS city, min(f.price_thb)::int AS min, count(*)::int AS n
         FROM flights f JOIN airports a ON a.code = f.destination GROUP BY 1,2 ORDER BY min`);
  } catch { /* the page still renders without the database */ }

  return (
    <>
      <section className="hero" style={{ backgroundImage: "url(/hero-japan.jpg)" }} data-testid="hero">
        <div className="container hero-inner">
          <h1>บินไปญี่ปุ่น ง่ายกว่าเดิม</h1>
          <p>ค้นหาและเปรียบเทียบเที่ยวบินกรุงเทพ → ญี่ปุ่น เรียงราคาจากถูกไปแพงให้ทันที</p>
          <SearchForm initial={initial} today={today} />
        </div>
      </section>
      <div className="container">
        {snap && <MockNotice capturedAt={snap.capturedAt} snapshotDate={snap.travelDate} />}

        <h2 className="section-title">ดีลยอดนิยมจากกรุงเทพ</h2>
        <div className="deals" data-testid="deals">
          {deals.map((d) => (
            <Link key={d.destination} className="deal" data-testid={`deal-${d.destination}`}
              href={`/search?${searchQuery({ ...initial, to: d.destination })}`}>
              <div className="sub">กรุงเทพ → {d.city ?? d.destination} ({d.destination})</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--navy)" }}>เริ่มต้น {baht(d.min)}</div>
              <div className="sub">{d.n} เที่ยวบินในข้อมูลจำลอง · เที่ยวเดียว ผู้ใหญ่ 1</div>
            </Link>
          ))}
          {deals.length === 0 && <div className="empty">ยังเชื่อมต่อฐานข้อมูลไม่ได้</div>}
        </div>

        <h2 className="section-title">คำถามที่พบบ่อย</h2>
        <div data-testid="faq">
          {FAQ.map(([qq, a]) => (
            <details key={qq} className="faq"><summary>{qq}</summary><p>{a}</p></details>
          ))}
        </div>
      </div>
    </>
  );
}

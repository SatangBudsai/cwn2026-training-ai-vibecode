import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { MockNotice } from "@/components/MockNotice";
import { getCalendarPrices, getSnapshot } from "@/lib/flights";
import { q } from "@/lib/db";
import { fmtDayMonth, isSelectableDate, todayISO } from "@/lib/dates";
import { baht } from "@/lib/format";
import { defaultSearch, searchQuery } from "@/lib/search";

export const dynamic = "force-dynamic";

const FAQ = [
  ["ข้อมูลเที่ยวบินในเว็บนี้มาจากไหน", "เป็นข้อมูลจำลองที่เก็บไว้เมื่อ 1 พ.ย. 2026 (00:03 น.) สำหรับเที่ยวบินกรุงเทพ → โตเกียว วันที่ 15 พ.ย. 2026 ครบ 300 เที่ยวบิน ใช้สาธิตการทำงานของระบบเท่านั้น ราคาจริงเปลี่ยนได้ตลอดเวลา"],
  ["ทำไมตอนแรกเห็น 22 เที่ยวบิน", "ผลแรกแสดง 22 เที่ยวบิน (ยอดนิยม 3 + อื่น ๆ 19) กด “ดูเที่ยวบินเพิ่มเติม” เพื่อโหลดครบทั้ง 300 เที่ยวบินในครั้งเดียว ส่วนตัวกรองจะค้นจากทั้ง 300 เที่ยวบินเสมอ"],
  ["จองแล้วต้องจ่ายเงินไหม", "ไม่ต้อง ระบบบันทึกการจองลงฐานข้อมูลและออกรหัสจองจำลองให้ ไม่มีการตัดเงินหรือออกตั๋วจริง"],
  ["ราคาที่แสดงรวมอะไรบ้าง", "ราคารวมภาษีและค่าธรรมเนียมต่อผู้โดยสารที่มีที่นั่ง 1 ท่าน อาจมีค่าสัมภาระหรือค่าบริการอื่นเพิ่มเติม (กฎ C9)"],
  ["เวลาที่แสดงเป็นเวลาของที่ไหน", "เวลาออกเป็นเวลาท้องถิ่นของสนามบินต้นทาง และเวลาถึงเป็นเวลาท้องถิ่นของสนามบินปลายทาง ญี่ปุ่นเร็วกว่าไทย 2 ชั่วโมง"],
];

export default async function Home() {
  const today = todayISO();
  const initial = defaultSearch(today);
  let snap = null;
  let deals: { destination: string; city: string | null; min: number; n: number }[] = [];
  let picks: { title: string; why: string; href: string }[] = [];
  let prices: Record<string, number> = {};
  try {
    snap = await getSnapshot();
    prices = await getCalendarPrices();
    picks = await dealPicks(snap?.travelDate ?? initial.date, today, initial);
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
          <SearchForm initial={initial} today={today} prices={prices} />
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

        <h2 className="section-title">สำรวจดีลด้วย AI</h2>
        <p className="sub">ตัวช่วยแนะนำดีลแบบทดลอง เวอร์ชันนี้ยังไม่ได้เรียกโมเดล AI จริง แต่คัดจากข้อมูลจำลองด้วยกฎง่าย ๆ (ราคาต่ำสุด บินตรง และวันที่ถูกกว่า)</p>
        <div className="ai-deals" data-testid="ai-deals">
          {picks.map((d) => (
            <Link key={d.title} className="ai-deal" href={d.href}>
              <b>{d.title}</b>
              <div className="sub">{d.why}</div>
            </Link>
          ))}
          {picks.length === 0 && <div className="empty">ยังเชื่อมต่อฐานข้อมูลไม่ได้</div>}
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

/** Rule-based picks from the mock data (cheapest overall, cheapest nonstop, a cheaper travel date). */
async function dealPicks(snapDate: string, today: string, initial: ReturnType<typeof defaultSearch>) {
  const [cheap] = await q<{ price: number; dep: string; name: string }>(
    `SELECT f.price_thb AS price, to_char(f.depart_time,'HH24:MI') AS dep, a.name_th AS name FROM flights f
       JOIN flight_airlines fa ON fa.flight_id = f.id AND fa.position = 0 JOIN airlines a ON a.code = fa.airline_code
      ORDER BY f.price_thb, f.display_order LIMIT 1`);
  const [direct] = await q<{ price: number; dep: string; name: string }>(
    `SELECT f.price_thb AS price, to_char(f.depart_time,'HH24:MI') AS dep, a.name_th AS name FROM flights f
       JOIN flight_airlines fa ON fa.flight_id = f.id AND fa.position = 0 JOIN airlines a ON a.code = fa.airline_code
      WHERE f.stops = 0 ORDER BY f.price_thb, f.display_order LIMIT 1`);
  const [cd] = await q<{ d: string; price: number }>("SELECT to_char(travel_date,'YYYY-MM-DD') AS d, price_thb AS price FROM cheaper_dates ORDER BY price_thb LIMIT 1");
  const date = isSelectableDate(snapDate, today) ? snapDate : initial.date;
  const base = { ...initial, trip: "oneway" as const, to: "TYO", date, ret: "" };
  const out: { title: string; why: string; href: string }[] = [];
  if (cheap) out.push({ title: `ถูกที่สุด ${baht(cheap.price)}`, why: `${cheap.name} ออก ${cheap.dep} น. กรุงเทพ → โตเกียว ${fmtDayMonth(date)}`, href: `/search?${searchQuery(base)}` });
  if (direct) out.push({ title: `บินตรงถูกสุด ${baht(direct.price)}`, why: `${direct.name} ออก ${direct.dep} น. ไม่ต้องต่อเครื่อง`, href: `/search?${searchQuery(base)}` });
  if (cd && isSelectableDate(cd.d, today)) out.push({ title: `เดินทาง ${fmtDayMonth(cd.d)} เริ่มต้น ${baht(cd.price)}`, why: "วันที่ใกล้เคียงที่ราคาต่ำกว่า (จากข้อมูลที่เก็บ)", href: `/search?${searchQuery({ ...base, date: cd.d })}` });
  return out;
}

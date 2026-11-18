import { MockNotice } from "@/components/MockNotice";
import { Results } from "@/components/Results";
import { SearchForm } from "@/components/SearchForm";
import { addDays, diffDays, fmtLong, todayISO } from "@/lib/dates";
import { getCalendarPrices, getFilterOptions, getFlights, getInsights, getSnapshot } from "@/lib/flights";
import { cabinLabel, paxLabel } from "@/lib/passengers";
import { airportsOf, parsePlaceIds, placesLabel } from "@/lib/places";
import { parseSearch, searchErrors, searchQuery, type RawParams } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = await searchParams;
  const prices = await getCalendarPrices().catch(() => ({}));
  const today = todayISO();
  const s = parseSearch(raw, today);
  const errors = searchErrors(s, today);
  const from = parsePlaceIds(s.from);
  const to = parsePlaceIds(s.to);
  const query = searchQuery(s);
  const queryNoDate = query.split("&").filter((kv) => !kv.startsWith("date=")).join("&");

  const head = (strip?: React.ReactNode) => (
    <div className="container results-container">
      {strip}
      <SearchForm key={query} initial={s} today={today} prices={prices} compact />
    </div>
  );
  const header = head();
  if (errors.length) {
    return (
      <>{header}
        <div className="container results-container">
          <div className="notice notice-error" data-testid="search-errors">{errors.map((e) => <div key={e}>• {e}</div>)}</div>
        </div>
      </>
    );
  }

  const snap = await getSnapshot();
  if (!snap) return <>{header}<div className="container results-container"><div className="notice notice-error">ฐานข้อมูลยังไม่พร้อม กรุณาลองใหม่</div></div></>;
  const shift = diffDays(s.date, snap.travelDate);
  const flights = s.cabin === "economy"
    ? await getFlights({ origins: airportsOf(from), destinations: airportsOf(to), shiftDays: shift })
    : [];
  const [insights, opts] = await Promise.all([getInsights(snap.id), getFilterOptions(snap.id)]);
  const c = insights?.cheaper[0];
  const cheaper = c ? { date: addDays(s.date, diffDays(c.date, snap.travelDate)), price: c.price } : null;

  return (
    <>
      {head(
        <div className="results-strip">
          <h1 className="page-title" data-testid="results-title">
            การค้นหาเที่ยวบิน: {placesLabel(from)} → {placesLabel(to)}
          </h1>
          <div className="sub" data-testid="results-summary">
            {s.trip === "oneway" ? "เที่ยวเดียว" : s.trip === "roundtrip" ? "ไป-กลับ (แสดงเฉพาะขาไป)" : "หลายเมือง (แสดงเฉพาะเที่ยวบินแรก)"} · {fmtLong(s.date)} · {paxLabel(s.pax)} · {cabinLabel(s.cabin)}
          </div>
        </div>,
      )}
      <div className="container results-container">
        {s.cabin !== "economy" && (
          <div className="notice notice-info" data-testid="cabin-note">ข้อมูลจำลองมีเฉพาะชั้นประหยัด จึงไม่มีผลลัพธ์สำหรับ{cabinLabel(s.cabin)}</div>
        )}
        <Results
          flights={flights}
          insights={insights}
          cheaper={flights.length ? cheaper : null}
          airlines={opts.airlines}
          connecting={opts.connecting}
          pax={s.pax}
          date={s.date}
          today={today}
          query={query}
          queryNoDate={queryNoDate}
          layoverCeil={snap.layoverMax}
          durationCeilMin={snap.durationMax}
          moreInSource={snap.moreNotEmbedded}
          fromLabel={placesLabel(from)}
          toLabel={placesLabel(to)}
        />
        {/* full disclaimer under the list; the header badge keeps "ข้อมูลจำลอง" visible at all times */}
        <MockNotice capturedAt={snap.capturedAt} snapshotDate={snap.travelDate} searchDate={s.date} />
        <p className="sub" data-testid="time-note">
          เวลาที่แสดงเป็นเวลาท้องถิ่นของสนามบินต้นทางและปลายทาง (ญี่ปุ่นเร็วกว่าไทย 2 ชั่วโมง) · “+1” หมายถึงถึงปลายทางในวันถัดไป
        </p>
      </div>
    </>
  );
}

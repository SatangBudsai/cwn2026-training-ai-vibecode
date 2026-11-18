'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from './Header';
import Modal, { CloseButton } from './Modal';
import Icon from './Icon';
import { FlightDetails } from './FlightRow';
import { PaxDialog } from './SearchForm';
import { Insight, PriceHistory } from './Insights';
import { Flight, baht, co2Label, dateAria, dateShort, rowSummary } from '@/lib/format';
import { CABINS, TRIPS, paxTotal, queryString, readQuery } from '@/lib/search';

type Option = { providerCode: string; providerName: string; isAirline: boolean; price: { amount: number }; additionalFee: number | null };
type Data = { flight: Flight; booking: { options: Option[] } | null; insights: Insight | null };

// หน้าตัวเลือกการจอง (A35 · B57–B66 · C55–C57)
export default function BookingView() {
  const params = useSearchParams();
  const router = useRouter();
  const query = useMemo(() => readQuery(new URLSearchParams(params.toString())), [params]);
  const id = params.get('id');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<null | 'share' | 'pax' | 'rank' | 'fee' | 'signin'>(null);
  useEffect(() => {
    fetch(`/api/booking?id=${id}`).then(r => (r.ok ? r.json() : Promise.reject())).then(setData).catch(() => setError(true));
  }, [id]);
  // ย้อนกลับ/เปลี่ยนเที่ยวบิน = เปิดหน้าผลค้นหาใหม่ (ไม่ใช่ history.back · C56) → รายการเริ่มใหม่ 21 ใบ (C57)
  const searchHref = `/search?${queryString(query)}`;
  const f = data?.flight;
  const options: Option[] = data?.booking?.options ?? (f ? [{
    providerCode: f.airlineCodes.split(',')[0], providerName: f.airlineNames[0], isAirline: true, price: f.price, additionalFee: null,
  }] : []);
  const lowest = options.length ? Math.min(...options.map(o => o.price.amount)) : null;
  const sw = 'ติดตามราคาเที่ยวบินที่เลือก จาก กรุงเทพมหานคร ไป โตเกียว ออกเดินทางวันที่ 2026-11-15';
  return (
    <>
      <Header backHref={searchHref} />
      <main id="main" className="booking">
        {error && <p>ไม่พบเที่ยวบินนี้</p>}
        {f && (
          <>
            <div className="booking-head">
              <h1 className="booking-title">สรุปแผนการเดินทาง</h1>
              <button type="button" className="tool-btn" aria-label="แชร์เที่ยวบินนี้" onClick={() => setDialog('share')}><Icon name="share" className="icon-sm" />แชร์</button>
            </div>
            <div className="trip-summary">
              <div className="trip-cities">{query.from} <Icon name="right" className="icon-sm" /> {query.to}</div>
              <div className="trip-meta">
                {TRIPS.find(t => t[0] === query.trip)?.[1]}·{CABINS.find(c => c[0] === query.cabin)?.[1]}·
                <button type="button" className="link-btn" aria-label={`ผู้โดยสาร ${paxTotal(query.pax)} คน เปลี่ยนจำนวนผู้โดยสาร`} onClick={() => setDialog('pax')}>ผู้โดยสาร {paxTotal(query.pax)} คน</button>
              </div>
              {lowest !== null && <div className="trip-price"><span className="price">{baht(lowest)}</span> ราคารวมที่ต่ำที่สุด</div>}
            </div>
            <div className="selected-wrap">
              <section className="selected">
                <h2 className="list-title">เที่ยวบินที่เลือก</h2>
                <ul className="flight-list">
                  <li className={`row ${open ? 'expanded' : ''}`}>
                    <div className="row-main">
                      <div className="row-summary">{open ? `เที่ยวบินขาไป · ${dateShort(f.departureLocal)}` : `${dateShort(f.departureLocal)} · ${rowSummary(f)}`}</div>
                      <button type="button" className="co2-btn" aria-label={co2Label(f)}>CO2e {f.co2e.kg}กก.</button>
                      {open && (
                        <button type="button" className="tool-btn" aria-label={`เปลี่ยนเที่ยวบิน ออกเดินทางจาก ${f.legs[0].departureAirport.name}, ${f.legs[0].departureAirport.code}`}
                          onClick={() => router.push(searchHref)}>เปลี่ยนเที่ยวบิน</button>
                      )}
                      <button type="button" className="expand-btn" aria-expanded={open}
                        aria-label={`รายละเอียดเที่ยวบิน เที่ยวบินขาไปในวัน${dateAria(f.departureLocal)} ออกเดินทางจาก ${f.legs[0].departureAirport.name}`}
                        onClick={() => setOpen(!open)}><Icon name={open ? 'up' : 'down'} /></button>
                    </div>
                    {open && <FlightDetails f={f} />}
                  </li>
                </ul>
              </section>
              <section className="track">
                <h2 className="track-title">ติดตามราคา</h2>
                <div className="track-row"><span>{sw}</span>
                  <button type="button" role="switch" aria-checked={false} aria-label={sw} className="switch" onClick={() => setDialog('signin')}><span /></button>
                </div>
              </section>
            </div>
            <section className="options-section">
              <h2 className="list-title">ตัวเลือกการจอง</h2>
              {options.length > 1 && (
                <div className="list-note">วิธีจัดอันดับตัวเลือก
                  <button type="button" className="icon-btn" aria-label="ดูข้อมูลเพิ่มเติมเกี่ยวกับตัวเลือกการจอง" onClick={() => setDialog('rank')}><Icon name="info" className="icon-sm" /></button>
                </div>
              )}
              <ul className="vendor-list">
                {options.map(o => (
                  <li key={o.providerName} className="vendor">
                    <span className="vendor-name">จองกับ {o.providerName}</span>
                    {o.isAirline && <span className="vendor-badge">สายการบิน</span>}
                    {o.additionalFee ? (
                      <span className="vendor-fee">รวมค่าธรรมเนียมเพิ่มเติม {baht(o.additionalFee)}
                        <button type="button" className="icon-btn" aria-label="ข้อมูลเพิ่มเติมเกี่ยวกับค่าอำนวยความสะดวก" onClick={() => setDialog('fee')}><Icon name="info" className="icon-sm" /></button>
                      </span>
                    ) : null}
                    <span className={`price ${o.price.amount === lowest ? 'good' : ''}`}>{baht(o.price.amount)}</span>
                    <button type="button" className="primary-btn"
                      aria-label={`ดำเนินการต่อเพื่อจองกับ${o.isAirline ? 'สายการบิน ' : ' '}${o.providerName} ในราคา ${o.price.amount} บาทไทย${o.additionalFee ? `. รวมค่าธรรมเนียมเพิ่มเติม ${o.additionalFee} บาทไทย` : ''}`}
                      onClick={() => alert('แอปนี้ไม่ได้เชื่อมต่อระบบจองของผู้ขาย')}>ดำเนินการต่อ</button>
                  </li>
                ))}
              </ul>
              <div className="price-note">ราคารวมภาษีที่ต้องจ่าย + ค่าธรรมเนียมสำหรับผู้ใหญ่ {query.pax.adults} ท่าน อาจมีการเรียกเก็บเงินเพิ่มเติมและค่าธรรมเนียมสัมภาระ</div>
            </section>
            {data?.insights && lowest !== null && (
              <section className="insights">
                <h3 className="list-title">ข้อมูลเชิงลึกด้านราคา</h3>
                <h4 className="insights-title">ราคาของผลค้นหานี้อยู่ระหว่าง {baht(data.insights.typicalLow)}–{data.insights.typicalHigh.toLocaleString('en-US')} โดยปกติ</h4>
                <PriceHistory data={data.insights} />
              </section>
            )}
          </>
        )}
      </main>
      {dialog === 'share' && (
        <Modal label="แชร์เที่ยวบินนี้" onClose={() => setDialog(null)} className="info-dialog">
          <h2 className="dialog-title">แชร์เที่ยวบินนี้</h2>
          <CloseButton onClose={() => setDialog(null)} label="ปิด" />
          <button type="button" className="tool-btn" onClick={() => navigator.clipboard?.writeText(location.href)}>คัดลอกลิงก์</button>
        </Modal>
      )}
      {dialog === 'pax' && <PaxDialog value={query.pax} onClose={() => setDialog(null)} onDone={p => { setDialog(null); router.push(`/booking?${queryString({ ...query, pax: p })}&id=${id}`); }} />}
      {dialog === 'rank' && (
        <Modal label="วิธีจัดอันดับตัวเลือก" onClose={() => setDialog(null)} className="info-dialog">
          <CloseButton onClose={() => setDialog(null)} />
          <p>ตัวเลือกการจองเรียงตามราคา ราคาที่ต่ำที่สุดแสดงเป็นสีเขียว</p>
        </Modal>
      )}
      {dialog === 'fee' && (
        <Modal label="ค่าอำนวยความสะดวก" onClose={() => setDialog(null)} className="info-dialog">
          <CloseButton onClose={() => setDialog(null)} />
          <p>ราคานี้รวมค่าธรรมเนียมเพิ่มเติมที่ผู้ขายเรียกเก็บแล้ว</p>
        </Modal>
      )}
      {dialog === 'signin' && (
        <Modal label="ลงชื่อเข้าใช้เพื่อติดตามราคา" onClose={() => setDialog(null)} className="info-dialog">
          <h2 className="dialog-title">ลงชื่อเข้าใช้เพื่อติดตามราคา</h2>
          <button type="button" className="text-btn" onClick={() => setDialog(null)}>ปิด</button>
        </Modal>
      )}
    </>
  );
}

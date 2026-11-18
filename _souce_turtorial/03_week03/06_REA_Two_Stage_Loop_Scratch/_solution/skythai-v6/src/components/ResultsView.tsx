'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import SearchForm from './SearchForm';
import FilterBar, { EMPTY, Facets } from './FilterBar';
import FlightRow from './FlightRow';
import Insights, { Insight, TrackPrices } from './Insights';
import Modal, { CloseButton } from './Modal';
import Icon from './Icon';
import { Filters, SORTS, Sort, anyActive, readFilters, writeFilters } from '@/lib/filters';
import { Flight, baht } from '@/lib/format';
import { hasData, queryString, readQuery } from '@/lib/search';

type Result = { scope: 'initial' | 'all'; filtered: boolean; sort: Sort; popularCount: number; cheapest: number | null; flights: Flight[] };

export default function ResultsView() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const query = useMemo(() => readQuery(new URLSearchParams(params.toString())), [params]);
  const filters = useMemo(() => readFilters(new URLSearchParams(params.toString())), [params]);
  const sort = (params.get('sort') || 'best') as Sort;
  const scope = params.get('more') === '1' ? 'all' : 'initial';
  const tab = params.get('tab') === 'cheapest' ? 'cheapest' : 'best';
  const available = hasData(query);

  const [res, setRes] = useState<Result | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [dialog, setDialog] = useState<null | 'rank' | 'bags' | 'assist'>(null);
  const [sortOpen, setSortOpen] = useState(false);

  const setParams = useCallback((edit: (q: URLSearchParams) => void, push = true) => {
    const q = new URLSearchParams(params.toString());
    edit(q);
    const url = `${path}?${q.toString()}`;
    if (push) router.push(url, { scroll: false }); else router.replace(url, { scroll: false });
  }, [params, path, router]);
  const setFilters = (f: Filters) => setParams(q => { writeFilters(f, q); q.delete('more'); });

  useEffect(() => {
    if (!available) { setRes(null); return; }
    const q = new URLSearchParams();
    writeFilters(filters, q);
    q.set('scope', scope);
    q.set('sort', sort);
    const ctl = new AbortController();
    fetch(`/api/flights?${q}`, { signal: ctl.signal }).then(r => r.json()).then(setRes).catch(() => {});
    return () => ctl.abort();
  }, [available, filters, scope, sort]);
  useEffect(() => {
    if (!available) return;
    fetch('/api/facets').then(r => r.json()).then(setFacets).catch(() => {});
    fetch('/api/insights').then(r => r.json()).then(setInsight).catch(() => {});
  }, [available]);

  const filtered = anyActive(filters);
  const flights = res?.flights || [];
  const popular = res ? flights.slice(0, res.popularCount) : [];
  const others = res ? flights.slice(res.popularCount) : [];
  const minPrice = flights.length ? Math.min(...flights.map(f => f.price.amount)) : null;
  const bookingHref = (f: Flight) => `/booking?${queryString(query)}&id=${f.id}`;
  const sortLabel = SORTS.find(s => s[0] === sort)![1];
  const airlines = [...new Set(flights.flatMap(f => f.airlineNames))];
  const showMore = res && !res.filtered && res.scope === 'initial';
  const tabName = (t: 'best' | 'cheapest') => t === 'best'
    ? 'ดีที่สุดดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ'
    : `ถูกที่สุด เริ่มต้น ${res?.cheapest ?? ''} บาทไทย ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ`;

  const list = (rows: Flight[], withMore: boolean) => (
    <ul className="flight-list">
      {rows.map(f => <FlightRow key={f.id} f={f} cheapest={f.price.amount === minPrice} bookingHref={bookingHref(f)} />)}
      {withMore && (
        <li className="more-row">
          <button type="button" className="more-btn" onClick={() => setParams(q => q.set('more', '1'))}>
            <Icon name="down" className="icon-sm" />ดูเที่ยวบินเพิ่มเติม
          </button>
        </li>
      )}
    </ul>
  );
  const priceNote = (
    <div className="price-note">
      ราคารวมภาษีที่ต้องจ่าย + ค่าธรรมเนียมสำหรับผู้ใหญ่ {query.pax.adults} ท่าน อาจมีการเรียกเก็บเงินเพิ่มเติมและ
      <button type="button" className="link-btn" onClick={() => setDialog('bags')}>ค่าธรรมเนียมสัมภาระ</button>
      ข้อมูล
      <button type="button" className="link-btn" onClick={() => setDialog('assist')}>ความช่วยเหลือสำหรับผู้โดยสาร</button>
    </div>
  );
  const sortButton = (
    <div className="sort-wrap">
      <button type="button" className="sort-btn" aria-label={`จัดเรียงตาม${sortLabel}, เปลี่ยนลำดับการจัดเรียง`} aria-expanded={sortOpen}
        onClick={() => setSortOpen(!sortOpen)}>จัดเรียงตาม{sortLabel}<Icon name="down" className="icon-sm" /></button>
      {sortOpen && (
        <div role="menu" aria-label="เลือกลำดับการจัดเรียง" className="menu sort-menu">
          {SORTS.map(([v, l]) => (
            <div key={v} role="menuitemradio" aria-checked={v === sort} tabIndex={0} className="menu-item"
              onClick={() => { setSortOpen(false); setParams(q => (v === 'best' ? q.delete('sort') : q.set('sort', v))); }}
              onKeyDown={e => { if (e.key === 'Enter') { setSortOpen(false); setParams(q => (v === 'best' ? q.delete('sort') : q.set('sort', v))); } }}>
              {v === sort && <Icon name="check" className="icon-sm" />}{l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
  const rankInfo = (
    <button type="button" className="icon-btn" aria-label="ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ"
      onClick={e => { e.stopPropagation(); setDialog('rank'); }}><Icon name="info" className="icon-sm" /></button>
  );

  return (
    <>
      <SearchForm initial={query} mode="results">
        {available && <FilterBar filters={filters} setFilters={setFilters} facets={facets} />}
      </SearchForm>
      <main id="main" className="results">
        <h2 className="results-title">ผลการค้นหา</h2>
        {!available && (
          <div className="empty">
            <h3>ไม่พบตัวเลือกที่ตรงกับการค้นหา</h3>
            <p>ลองเปลี่ยนวันที่หรือจุดหมายเพื่อดูผลลัพธ์ (ข้อมูลที่มี: กรุงเทพมหานคร → โตเกียว · เที่ยวเดียว · อาทิตย์ 15 พ.ย. 2026 · ชั้นประหยัด)</p>
          </div>
        )}
        {available && !res && <div className="loading" role="status">กำลังโหลดผลการค้นหา</div>}
        {available && res && (
          <>
            <div className="result-count">มีผลลัพธ์ {flights.length} รายการ</div>
            {flights.length === 0 ? (
              <div className="empty">
                <h3>ไม่พบตัวเลือกที่ตรงกับตัวกรองของคุณ</h3>
                <p>ลองล้างตัวกรองเพื่อดูผลลัพธ์เพิ่มเติม</p>
                <button type="button" className="primary-btn" onClick={() => setFilters(EMPTY)}>ล้างตัวกรองทั้งหมด</button>
              </div>
            ) : (
              <>
                <div role="tablist" className="tabs">
                  {(['best', 'cheapest'] as const).map(t => (
                    <div key={t} role="tab" aria-selected={tab === t} aria-label={tabName(t)} tabIndex={0} className={`tab ${tab === t ? 'active' : ''}`}
                      onClick={() => setParams(q => (t === 'best' ? q.delete('tab') : q.set('tab', t)))}
                      onKeyDown={e => e.key === 'Enter' && setParams(q => (t === 'best' ? q.delete('tab') : q.set('tab', t)))}>
                      <span>{t === 'best' ? 'ดีที่สุด' : <>ถูกที่สุด <span className="tab-price">เริ่มต้น {res.cheapest !== null ? baht(res.cheapest) : ''}</span></>}</span>
                      {rankInfo}
                    </div>
                  ))}
                </div>
                <div role="tabpanel" aria-label={tabName(tab)} className="tabpanel">
                  {filtered && <TrackPrices insightLess />}
                  {sort === 'best' ? (
                    <>
                      <div className="list-head">
                        <div>
                          <h3 className="list-title">เที่ยวบินยอดนิยม</h3>
                          <div className="list-note">จัดอันดับตามราคาและความสะดวก{rankInfo}</div>
                          {priceNote}
                        </div>
                        {sortButton}
                      </div>
                      {list(popular, false)}
                      {!filtered && tab === 'best' && insight && <Insights data={insight} />}
                      {!filtered && <TrackPrices />}
                      {others.length > 0 && <h3 className="list-title">เที่ยวบินอื่นๆ</h3>}
                      {list(others, !!showMore)}
                    </>
                  ) : (
                    <>
                      <div className="list-head">
                        <div>
                          <h3 className="list-title">เที่ยวบินทั้งหมด</h3>
                          {priceNote}
                        </div>
                        {sortButton}
                      </div>
                      {!filtered && tab === 'best' && insight && <Insights data={insight} />}
                      {list(flights, !!showMore)}
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
      {dialog === 'rank' && (
        <Modal label="หากกำลังมองหาการเดินทางแบบไร้กังวล เที่ยวบินเหล่านี้ได้รับเลือกโดยพิจารณาความสมดุลระหว่างราคากับความสะดวกสบาย" onClose={() => setDialog(null)} className="info-dialog">
          <CloseButton onClose={() => setDialog(null)} />
          <p>หากกำลังมองหาการเดินทางแบบไร้กังวล เที่ยวบินเหล่านี้ได้รับเลือกโดยพิจารณาความสมดุลระหว่างราคากับความสะดวกสบายจากปัจจัยต่างๆ เช่น ระยะเวลาและจำนวนครั้งที่หยุดพัก เพื่อให้การเดินทางของคุณราบรื่นในราคาที่จับต้องได้</p>
          <p>แท็บ &quot;ถูกที่สุด&quot; แสดงราคาต่ำสุดของผลการค้นหาที่ตรงกับตัวกรองปัจจุบัน</p>
        </Modal>
      )}
      {(dialog === 'bags' || dialog === 'assist') && (
        <Modal label={dialog === 'bags' ? 'ค่าธรรมเนียมสัมภาระ' : 'ความช่วยเหลือสำหรับผู้โดยสาร'} onClose={() => setDialog(null)} className="info-dialog">
          <h1 className="dialog-title">{dialog === 'bags' ? 'ค่าธรรมเนียมสัมภาระ' : 'ความช่วยเหลือสำหรับผู้โดยสาร'}</h1>
          <p>สายการบินในผลการค้นหานี้ (โปรดตรวจสอบนโยบายกับสายการบินโดยตรง)</p>
          <ul className="plain-list">{airlines.map(a => <li key={a}>{a}</li>)}</ul>
          <button type="button" className="text-btn" onClick={() => setDialog(null)}>ปิด</button>
        </Modal>
      )}
    </>
  );
}

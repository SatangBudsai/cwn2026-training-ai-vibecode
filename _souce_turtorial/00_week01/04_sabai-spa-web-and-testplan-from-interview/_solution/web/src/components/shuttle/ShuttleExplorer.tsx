'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, ErrorMessage, LinkButton, Section } from '@/components/ui';
import { f7 } from '@/i18n/f7';
import { pick } from '@/i18n/locales';
import { api } from '@/lib/api-client';
import { formatBaht } from '@/lib/format';
import type { ClockResponse, Hotel, HotelsResponse, Locale, QuoteRequest, QuoteResponse, ShuttleInput } from '@/types';
import { ShuttlePicker } from './ShuttlePicker';
import { isAbort, toUiError, type UiError } from './to-ui-error';
import styles from './shuttle.module.css';

type FeeBand = 'free' | 'paid' | 'refused';

/** แถบค่ารถของตารางโรงแรม (BR-34, BR-35) เทียบเป็นสิบเท่า ไม่ใช้ float · เครื่องคำนวณใช้ค่าจาก API เท่านั้น */
function feeBand(distanceKm: string): FeeBand {
  const [whole, frac = '0'] = distanceKm.split('.');
  const tenths = Number(whole) * 10 + Number(frac.slice(0, 1));
  if (tenths <= 50) return 'free';
  return tenths <= 150 ? 'paid' : 'refused';
}

function isShuttleError(code: string): boolean {
  return code.startsWith('distance-') || code === 'hotel-not-found';
}

/** ข้อมูลโรงแรมและวันจองอ่านจาก API ตอนเปิดหน้าและตอนกดคำนวณ จึงตรงกับนาฬิกาที่ล็อกไว้เสมอ */
export function ShuttleExplorer({ locale }: { locale: Locale }) {
  const m = f7[locale];

  const [hotels, setHotels] = useState<Hotel[] | null>(null);
  const [hotelsError, setHotelsError] = useState<UiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [shuttle, setShuttle] = useState<ShuttleInput | null>(null);
  const [party, setParty] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [result, setResult] = useState<QuoteResponse | null>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api<HotelsResponse>('/api/hotels', { locale, signal: ctrl.signal })
      .then((data) => {
        setHotels(data.hotels);
        setHotelsError(null);
      })
      .catch((err: unknown) => {
        if (!isAbort(err)) setHotelsError(toUiError(err, locale));
      });
    return () => ctrl.abort();
  }, [locale, attempt]);

  useEffect(() => () => pending.current?.abort(), []);

  /** ค่าที่แสดงต้องตรงกับที่กรอก: แก้ค่าเมื่อไรก็ล้างผลเดิมและยกเลิกคำขอที่ค้าง */
  const invalidate = () => {
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
    setError(null);
    setResult(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    invalidate();
    const ctrl = new AbortController();
    pending.current = ctrl;
    setBusy(true);
    try {
      const clock = await api<ClockResponse>('/api/clock', { locale, signal: ctrl.signal });
      const body: QuoteRequest = {
        serviceId: 'S01',
        partySize: Number(party),
        date: clock.minBookingDate,
        shuttle: shuttle ?? {},
      };
      const quote = await api<QuoteResponse>('/api/quote', { locale, body, signal: ctrl.signal });
      setResult(quote);
    } catch (err) {
      if (isAbort(err)) return;
      setError(toUiError(err, locale));
    }
    if (pending.current === ctrl) {
      pending.current = null;
      setBusy(false);
    }
  };

  const fieldError = error && isShuttleError(error.code) ? error : null;
  const formError = error && !isShuttleError(error.code) ? error : null;

  return (
    <>
      <Section tone="cream" testId="shuttle-hotels-section" eyebrow={m.scHotelsEyebrow} title={m.scHotelsTitle}>
        {hotelsError && (
          <div className={styles.hotelsError}>
            <ErrorMessage code={hotelsError.code} message={hotelsError.message} />
            <Button
              testId="shuttle-hotels-retry"
              variant="ghost"
              size="sm"
              onClick={() => {
                setHotelsError(null);
                setAttempt((n) => n + 1);
              }}
            >
              {m.scHotelsRetry}
            </Button>
          </div>
        )}
        {!hotels && !hotelsError && (
          <p className={styles.loading} data-testid="shuttle-hotels-loading">
            {m.scHotelsLoading}
          </p>
        )}
        {hotels && (
          <div className={styles.tableWrap}>
            <table className={styles.table} data-testid="shuttle-hotels">
              <thead>
                <tr>
                  <th scope="col">{m.scColHotel}</th>
                  <th scope="col" className={styles.numeric}>{m.scColDistance}</th>
                  <th scope="col" className={styles.numeric}>{m.scColFee}</th>
                </tr>
              </thead>
              <tbody>
                {hotels.map((h) => {
                  const band = feeBand(h.distanceKm);
                  return (
                    <tr key={h.id} data-testid={`shuttle-hotel-row-${h.id}`}>
                      <th scope="row">
                        {/* ตัดบรรทัดตรงช่องว่าง ชื่อโรงแรมจึงไม่ขาดกลางคำ */}
                        {pick(h.name, locale).split(' ').map((part, i) => (
                          <span key={i} className={styles.namePart}>
                            {part}{' '}
                          </span>
                        ))}
                      </th>
                      <td className={styles.numeric} data-testid={`shuttle-hotel-distance-${h.id}`}>
                        {h.distanceKm} {m.km}
                      </td>
                      <td className={styles.numeric} data-testid={`shuttle-hotel-fee-${h.id}`}>
                        <span className={styles[`fee-${band}`]}>
                          {band === 'free' ? m.scFeeFree : band === 'paid' ? m.scFeePaid : m.scFeeRefused}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="calculator" testId="shuttle-calc-section" eyebrow={m.scCalcEyebrow} title={m.scCalcTitle} subtitle={m.scCalcSub}>
        <div className={styles.calc}>
          <form className={styles.calcForm} onSubmit={onSubmit} noValidate data-testid="shuttle-calc-form">
            <ShuttlePicker
              locale={locale}
              hotels={hotels ?? []}
              required
              value={shuttle}
              onChange={(next) => {
                setShuttle(next);
                invalidate();
              }}
              error={fieldError}
            />
            <div className={`field ${styles.party}`}>
              <label htmlFor="shuttle-party">{m.scParty}</label>
              <input
                id="shuttle-party"
                className="input"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={party}
                onChange={(e) => {
                  setParty(e.target.value);
                  invalidate();
                }}
                data-testid="shuttle-party"
              />
            </div>
            {formError && <ErrorMessage code={formError.code} message={formError.message} />}
            <Button testId="shuttle-calc-submit" type="submit" variant="gold" size="lg" disabled={busy} className={styles.calcSubmit}>
              {busy ? m.scCalcSubmitting : m.scCalcSubmit}
            </Button>
          </form>

          <aside className={styles.resultPanel} aria-live="polite" data-testid="shuttle-result">
            {result ? (
              <>
                <dl className={styles.resultList}>
                  <div>
                    <dt>{m.scResultCars}</dt>
                    <dd>
                      <span className={styles.resultValue} data-testid="shuttle-result-cars">
                        {result.lines.cars}
                      </span>{' '}
                      <span className={styles.resultUnit}>{m.scResultCarsUnit}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>{m.scResultFee}</dt>
                    <dd>
                      <span className={styles.resultValue} data-testid="shuttle-result-fee">
                        {formatBaht(result.lines.transportFee, locale)}
                      </span>
                    </dd>
                  </div>
                </dl>
                <p className={styles.resultNote}>{m.scResultNote}</p>
                <LinkButton testId="shuttle-book-link" href={`/${locale}/booking`} variant="ghost-light" className={styles.resultCta}>
                  {m.scBook}
                </LinkButton>
              </>
            ) : (
              <p className={styles.resultEmpty}>{m.scResultEmpty}</p>
            )}
          </aside>
        </div>
      </Section>
    </>
  );
}

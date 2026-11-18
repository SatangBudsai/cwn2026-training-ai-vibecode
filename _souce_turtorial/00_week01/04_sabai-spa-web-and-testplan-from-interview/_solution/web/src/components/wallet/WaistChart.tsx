'use client';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui';
import { f6 } from '@/i18n/f6';
import { format } from '@/i18n/locales';
import { formatDate } from '@/lib/format';
import type { Locale, WaistPoint } from '@/types';
import styles from './wallet.module.css';

const HEIGHT = 300;
const MARGIN = { top: 34, right: 40, bottom: 56, left: 44 };
/** ระยะจากแกน y ถึงจุดแรก เพื่อไม่ให้จุดทับเส้นแกน */
const INSET = 14;

const SHORT_DATE_LOCALE: Record<Locale, string> = {
  th: 'th-TH-u-ca-gregory-nu-latn',
  en: 'en-GB',
  zh: 'zh-CN',
};

function shortDate(date: string, locale: Locale): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(SHORT_DATE_LOCALE[locale], { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** ช่องแกน y ที่อ่านง่าย: 1, 2, 5, 10… */
function niceStep(range: number): number {
  const rough = range / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const unit = rough / pow;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * pow;
}

export function WaistChart({ locale, points, reducedCm }: { locale: Locale; points: WaistPoint[]; reducedCm: string | null }) {
  const m = f6[locale];
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const titleId = useId();
  const descId = useId();

  // วาดตามความกว้างจริง ตัวอักษรจึงไม่หดตามจอมือถือ และ SVG ไม่ล้นกล่อง
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sorted = useMemo(() => [...points].sort((a, b) => a.date.localeCompare(b.date)), [points]);
  const values = sorted.map((p) => Number(p.cm));
  const yMin = Math.floor(Math.min(...values)) - 1;
  const yMax = Math.ceil(Math.max(...values)) + 1;
  const step = niceStep(yMax - yMin);
  const ticks: number[] = [];
  for (let t = Math.ceil(yMin / step) * step; t <= yMax; t += step) ticks.push(t);

  const plotLeft = MARGIN.left + INSET;
  const plotRight = Math.max(plotLeft + 1, width - MARGIN.right);
  const plotBottom = HEIGHT - MARGIN.bottom;
  const firstDay = dayNumber(sorted[0].date);
  const daySpan = dayNumber(sorted[sorted.length - 1].date) - firstDay;
  const xOf = (date: string) =>
    daySpan === 0 ? (plotLeft + plotRight) / 2 : plotLeft + ((dayNumber(date) - firstDay) / daySpan) * (plotRight - plotLeft);
  const yOf = (value: number) => MARGIN.top + ((yMax - value) / (yMax - yMin)) * (plotBottom - MARGIN.top);

  const marks = sorted.map((p, i) => ({ ...p, value: values[i], x: xOf(p.date), y: yOf(values[i]) }));
  const line = marks.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${marks[marks.length - 1].x.toFixed(1)} ${plotBottom} L${marks[0].x.toFixed(1)} ${plotBottom} Z`;

  const spacing = marks.length > 1 ? (plotRight - plotLeft) / (marks.length - 1) : plotRight - plotLeft;
  const tickEvery = Math.max(1, Math.ceil(56 / spacing));
  const tight = spacing < 38;

  const list = sorted.map((p) => format(m.chartPoint, { date: formatDate(p.date, locale), cm: p.cm, unit: m.waistUnit })).join(', ');
  const summary = format(m.chartSummary, { count: sorted.length, list });
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  return (
    <Card gold className={styles.chartCard} testId="wallet-waist">
      <div className={styles.chartHead}>
        <div>
          <h3>{m.waistTitle}</h3>
          {sorted.length > 1 && (
            <p className={styles.chartRange} data-testid="wallet-waist-range">
              {first.cm} → {last.cm} {m.waistUnit}
            </p>
          )}
        </div>
        {reducedCm !== null && (
          <p className={styles.chartReduced} data-testid="wallet-waist-reduced">
            {format(m.reduced, { cm: reducedCm })}
          </p>
        )}
      </div>

      <div ref={boxRef} className={styles.chartBox}>
        <svg
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className={styles.chartSvg}
          data-testid="wallet-waist-chart"
        >
          <title id={titleId}>{m.chartTitle}</title>
          <desc id={descId}>{summary}</desc>

          {/* แกน y และเส้นกริด */}
          <text x={0} y={14} className={styles.axisText}>
            {m.waistUnit}
          </text>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={MARGIN.left} x2={width - 8} y1={yOf(t)} y2={yOf(t)} className={styles.gridLine} />
              <text x={MARGIN.left - 8} y={yOf(t) + 4} textAnchor="end" className={styles.axisText}>
                {t}
              </text>
            </g>
          ))}
          <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top - 8} y2={plotBottom} className={styles.axisLine} />

          {/* แกน x */}
          <line x1={MARGIN.left} x2={width - 8} y1={plotBottom} y2={plotBottom} className={styles.axisLine} />
          {marks.map((p, i) =>
            i % tickEvery === 0 ? (
              <text key={p.date} x={p.x} y={plotBottom + 20} textAnchor="middle" className={styles.axisText}>
                {shortDate(p.date, locale)}
              </text>
            ) : null,
          )}
          <text x={(MARGIN.left + width) / 2} y={HEIGHT - 6} textAnchor="middle" className={styles.axisTitle}>
            {m.axisDate}
          </text>

          {/* เส้นและจุด */}
          <path d={area} className={styles.chartArea} />
          <path d={line} className={styles.chartLine} />
          {marks.map((p, i) => {
            const next = marks[i + 1];
            const prev = marks[i - 1];
            const rising = next ? next.value > p.value : prev ? p.value > prev.value : false;
            // วางค่าฝั่งที่เส้นไม่ผ่าน · เส้นลงวางขวาบน เส้นขึ้นวางซ้ายบน
            const below = tight && i % 2 === 1;
            return (
              <g key={p.date}>
                <title>{format(m.chartPoint, { date: formatDate(p.date, locale), cm: p.cm, unit: m.waistUnit })}</title>
                <circle cx={p.x} cy={p.y} r={16} className={styles.chartHit} />
                <g data-testid={`wallet-waist-point-${i}`} data-date={p.date} data-cm={p.cm}>
                  <circle cx={p.x} cy={p.y} r={5} className={styles.chartDot} />
                  <text
                    x={p.x + (rising ? -8 : 8)}
                    y={below ? p.y + 20 : p.y - 10}
                    textAnchor={rising ? 'end' : 'start'}
                    className={styles.chartValue}
                  >
                    {p.cm}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </Card>
  );
}

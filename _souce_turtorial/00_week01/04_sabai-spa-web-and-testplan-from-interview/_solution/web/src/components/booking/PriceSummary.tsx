import type { ReactNode } from 'react';
import { f4 } from '@/i18n/f4';
import { format } from '@/i18n/locales';
import { formatBaht } from '@/lib/format';
import type { DiscountSource, Locale, PriceLines, Tier } from '@/types';
import styles from './booking.module.css';

export interface PriceSummaryProps {
  locale: Locale;
  lines: PriceLines;
  partySize: number;
  tier?: Tier | null;
  /** ระหว่างโหลดราคาใหม่ หรือราคานี้ยังไม่รวมรายการล่าสุด */
  dim?: boolean;
}

/** ทุกตัวเลขมาจาก API ตรง ๆ · ไม่มีการบวกลบในหน้าเว็บ (NFR-11) */
export function PriceSummary({ locale, lines, partySize, tier, dim }: PriceSummaryProps) {
  const m = f4[locale];
  const sourceLabel: Record<DiscountSource, string> = {
    NONE: m.sourceNone,
    TIER: tier ? `${m.sourceTier} ${tier}` : m.sourceTier,
    GROUP: m.sourceGroup,
    BIRTHDAY: m.sourceBirthday,
  };
  return (
    <div className={dim ? `${styles.lines} ${styles.linesDim}` : styles.lines} aria-busy={dim || undefined}>
      <Row
        locale={locale}
        testId="booking-line-full-price"
        label={m.lineFull}
        detail={format(m.lineFullDetail, { n: partySize })}
        amount={lines.fullPrice}
      />
      <Row
        locale={locale}
        testId="booking-line-discount"
        label={format(m.lineDiscount, { percent: lines.discountPercent })}
        detail={<span data-testid="booking-discount-source">{sourceLabel[lines.discountSource]}</span>}
        amount={-lines.discountAmount}
      />
      <Row
        locale={locale}
        testId="booking-line-points"
        label={m.linePoints}
        detail={format(m.linePointsDetail, { n: lines.pointsRedeemed })}
        amount={-lines.pointsDiscount}
      />
      <Row
        locale={locale}
        testId="booking-line-transport"
        label={m.lineTransport}
        detail={lines.cars > 0 ? format(m.lineCars, { n: lines.cars }) : undefined}
        amount={lines.transportFee}
      />
      <Row locale={locale} testId="booking-line-giftcard" label={m.lineGiftCard} amount={-lines.giftCardAmount} />
      <div className={styles.payRow} data-testid="booking-pay-at-shop" data-amount={lines.payAtShop}>
        <span className={styles.payLabel}>{m.linePay}</span>
        <strong className={styles.payAmount}>{formatBaht(lines.payAtShop, locale)}</strong>
      </div>
    </div>
  );
}

function Row({ locale, testId, label, detail, amount }: { locale: Locale; testId: string; label: string; detail?: ReactNode; amount: number }) {
  return (
    <div className={styles.line} data-testid={testId} data-amount={Math.abs(amount)}>
      <span className={styles.lineLabel}>
        {label}
        {detail !== undefined && <small className={styles.lineDetail}>{detail}</small>}
      </span>
      <span className={styles.lineAmount}>{formatBaht(amount, locale)}</span>
    </div>
  );
}

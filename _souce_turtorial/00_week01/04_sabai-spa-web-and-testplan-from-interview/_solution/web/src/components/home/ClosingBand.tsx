import { LinkButton, Parallax, Reveal, SmartImage } from '@/components/ui';
import { common } from '@/i18n/common';
import { f1 } from '@/i18n/f1';
import type { Locale } from '@/types';
import styles from './home.module.css';

/** ปิดท้ายหน้าแรกด้วยภาพเต็มจอ ชวนจองหรือดูห้องก่อนมา */
export function ClosingBand({ locale }: { locale: Locale }) {
  const m = f1[locale];
  return (
    <section className={styles.closing} data-testid="home-closing">
      <Parallax strength={44} className={styles.closingStage}>
        <SmartImage src="/brand/shop/hero-ritual.jpg" alt={m.heroAltRitual} sizes="100vw" wrapperClassName={styles.closingImage} style={{ objectPosition: '62% 50%' }} />
      </Parallax>
      <div aria-hidden="true" className={styles.closingShade} />
      <Reveal className={`container ${styles.closingInner}`}>
        <p className={`eyebrow ${styles.closingEyebrow}`}>{m.closingEyebrow}</p>
        <h2 className={styles.closingTitle}>{m.closingTitle}</h2>
        <span aria-hidden="true" className={styles.ornament} />
        <p className={styles.closingLead}>{m.closingLead}</p>
        <div className={styles.closingActions}>
          <LinkButton testId="home-closing-book" href={`/${locale}/booking`} variant="gold" size="lg">
            {common[locale].book}
          </LinkButton>
          <LinkButton testId="home-closing-tour" href={`/${locale}/tour`} variant="ghost-light" size="lg">
            {m.closingTour}
          </LinkButton>
        </div>
      </Reveal>
    </section>
  );
}

import { LinkButton } from '@/components/ui';
import { common } from '@/i18n/common';
import { f1 } from '@/i18n/f1';
import type { Locale } from '@/types';
import { HeroSlider } from './HeroSlider';
import styles from './home.module.css';

export function Hero({ locale }: { locale: Locale }) {
  const m = f1[locale];
  const c = common[locale];
  return (
    <HeroSlider
      slides={[
        { src: '/brand/shop/hero-dusk.jpg', alt: m.heroAltDusk, position: '72% 50%' },
        { src: '/brand/shop/hero-ritual.jpg', alt: m.heroAltRitual, position: '62% 50%' },
        { src: '/brand/shop/hero-room.jpg', alt: m.heroAltRoom, position: '72% 50%' },
      ]}
      labels={{ slide: m.heroSlideLabel, pause: m.heroPause, play: m.heroPlay }}
    >
      <p className={`eyebrow ${styles.heroEyebrow}`}>{m.heroEyebrow}</p>
      <h1 className={styles.heroTitle}>
        <span className={styles.heroLine}>{m.heroTitleLine1}</span>
        <span className={styles.heroLine}>{m.heroTitleLine2}</span>
      </h1>
      <span aria-hidden="true" className={styles.heroRule} />
      <p className={styles.heroLead}>{m.heroLead}</p>
      <div className={styles.heroActions}>
        <LinkButton testId="home-hero-book" href={`/${locale}/booking`} variant="gold" size="lg" className={styles.heroBtn}>
          {c.book}
        </LinkButton>
        <LinkButton testId="home-hero-services" href={`/${locale}/services`} variant="ghost-light" size="lg" className={styles.heroBtn}>
          {m.heroServices}
        </LinkButton>
      </div>
      <a href="#home-story" className={styles.heroScroll} data-testid="home-hero-scroll" aria-label={m.heroScroll}>
        <span aria-hidden="true" className={styles.heroScrollLine} />
      </a>
    </HeroSlider>
  );
}

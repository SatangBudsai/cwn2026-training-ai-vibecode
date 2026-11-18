import type { Metadata } from 'next';
import { DESIGN_IMAGES } from '@/components/giftcard/GiftCardArt';
import { GiftCardCheck } from '@/components/giftcard/GiftCardCheck';
import { GiftCardPurchase } from '@/components/giftcard/GiftCardPurchase';
import styles from '@/components/giftcard/giftcard.module.css';
import { LinkButton, Reveal, Section, SmartImage, ThaiPattern } from '@/components/ui';
import { f7 } from '@/i18n/f7';
import { parseLocale } from '@/i18n/locales';
import type { GiftCardDesign, LocalePageProps, LocaleParams } from '@/types';

export const dynamic = 'force-dynamic';

const FAN: GiftCardDesign[] = ['LOTUS', 'GOLD', 'ORCHID'];

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  return { title: f7[locale].gcMetaTitle, description: f7[locale].gcLead };
}

export default async function GiftCardsPage({ params }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  const m = f7[locale];

  const terms = [
    { title: m.gcTerm1Title, body: m.gcTerm1Body },
    { title: m.gcTerm2Title, body: m.gcTerm2Body },
    { title: m.gcTerm3Title, body: m.gcTerm3Body },
  ];

  return (
    <>
      <section className={styles.hero} data-testid="giftcard-hero">
        <ThaiPattern tone="light" />
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <p className="eyebrow">{m.gcEyebrow}</p>
            <h1>{m.gcTitle}</h1>
            <p className={styles.heroLead}>{m.gcLead}</p>
            <LinkButton testId="giftcard-hero-cta" href="#buy" variant="gold">
              {m.gcHeroCta}
            </LinkButton>
          </div>
          <div className={styles.fan} aria-hidden="true">
            {FAN.map((design, i) => (
              <div key={design} className={styles.fanCard}>
                <SmartImage
                  src={DESIGN_IMAGES[design]}
                  alt=""
                  ratio="3 / 2"
                  sizes="(min-width: 920px) 380px, 70vw"
                  priority={i === 2}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <Section id="buy" testId="giftcard-buy-section" eyebrow={m.gcBuyEyebrow} title={m.gcBuyTitle} subtitle={m.gcBuySub}>
        <GiftCardPurchase locale={locale} />
      </Section>

      <Section tone="forest" pattern testId="giftcard-terms" eyebrow={m.gcTermsEyebrow} title={m.gcTermsTitle}>
        <div className={styles.terms}>
          {terms.map((term, i) => (
            <Reveal key={term.title} delay={i * 80}>
              <div className={styles.term}>
                <h3>{term.title}</h3>
                <p className={styles.termBody}>{term.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="cream" id="check" testId="giftcard-check-section" eyebrow={m.gcCheckEyebrow} title={m.gcCheckTitle} subtitle={m.gcCheckSub}>
        <GiftCardCheck locale={locale} />
      </Section>
    </>
  );
}

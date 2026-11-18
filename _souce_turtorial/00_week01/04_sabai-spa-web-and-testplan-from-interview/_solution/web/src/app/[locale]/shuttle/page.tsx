import type { Metadata } from 'next';
import { ShuttleExplorer } from '@/components/shuttle/ShuttleExplorer';
import styles from '@/components/shuttle/shuttle.module.css';
import { LinkButton, Reveal, Section, SmartImage } from '@/components/ui';
import { f7 } from '@/i18n/f7';
import { parseLocale } from '@/i18n/locales';
import type { LocalePageProps, LocaleParams } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  return { title: f7[locale].scMetaTitle, description: f7[locale].scLead };
}

export default async function ShuttlePage({ params }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  const m = f7[locale];

  const rules = [
    { title: m.scRule1Title, value: m.scRule1Value, body: m.scRule1Body },
    { title: m.scRule2Title, value: m.scRule2Value, body: m.scRule2Body },
    { title: m.scRule3Title, value: m.scRule3Value, body: m.scRule3Body },
    { title: m.scRule4Title, value: m.scRule4Value, body: m.scRule4Body },
  ];

  return (
    <>
      <section className={styles.hero} data-testid="shuttle-hero">
        <SmartImage
          src="/brand/shop/exterior-day.jpg"
          alt={m.scImageAlt}
          sizes="100vw"
          priority
          wrapperClassName={styles.heroImage}
        />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <p className="eyebrow">{m.scEyebrow}</p>
            <h1>{m.scTitle}</h1>
            <p className={styles.heroLead}>{m.scLead}</p>
            <LinkButton testId="shuttle-hero-cta" href="#calculator" variant="gold">
              {m.scCta}
            </LinkButton>
          </div>
        </div>
      </section>

      <Section testId="shuttle-rules-section" eyebrow={m.scRulesEyebrow} title={m.scRulesTitle}>
        <div className={styles.rules}>
          {rules.map((rule, i) => (
            <Reveal key={rule.title} delay={i * 70}>
              <div className={styles.rule}>
                <p className={styles.ruleTitle}>{rule.title}</p>
                <p className={styles.ruleValue}>{rule.value}</p>
                <p className={styles.ruleBody}>{rule.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className={styles.packageNote}>
          <p>{m.scPackageNote}</p>
          <LinkButton testId="shuttle-package-link" href={`/${locale}/packages/bangkok-relax`} variant="ghost" size="sm">
            {m.scPackageLink}
          </LinkButton>
        </div>
      </Section>

      <ShuttleExplorer locale={locale} />
    </>
  );
}

import type { Metadata } from 'next';
import styles from '@/components/people/people.module.css';
import { LinkButton, Reveal, Section, SmartImage } from '@/components/ui';
import { common } from '@/i18n/common';
import { f3, f3People } from '@/i18n/f3';
import { parseLocale, pick } from '@/i18n/locales';
import type { LocaleParams, LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  return { title: common[locale].navAbout, description: f3[locale].aboutLead };
}

/** ตัดบรรทัดตรงช่องว่างหรือหลังจุลภาคจีนเท่านั้น ข้อความจึงไม่ขาดกลางวลี เช่น "สาขา|เดียว" "水|疗" */
function phrases(text: string) {
  return text.split(/ |(?<=[，、])/).map((part, i) => (
    <span key={i} className={styles.noBreakPart}>
      {part}{' '}
    </span>
  ));
}

export default async function AboutPage({ params }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  const m = f3[locale];
  const c = common[locale];
  const owner = f3People.chan;
  const ownerName = pick(owner.name, locale);
  const ownerTitle = pick(owner.title, locale);

  const promises = [
    { id: 'hours', title: m.aboutPromiseHoursTitle, body: m.aboutPromiseHoursBody },
    { id: 'guest', title: m.aboutPromiseGuestTitle, body: m.aboutPromiseGuestBody },
    { id: 'language', title: m.aboutPromiseLanguageTitle, body: m.aboutPromiseLanguageBody },
    { id: 'privacy', title: m.aboutPromisePrivacyTitle, body: m.aboutPromisePrivacyBody },
  ];

  return (
    <>
      <section className={styles.aboutHero} data-testid="about-hero">
        <div className={styles.aboutHeroText}>
          <p className="eyebrow">{m.aboutEyebrow}</p>
          <h1 className={styles.heroTitle}>{phrases(m.aboutTitle)}</h1>
          <p className={styles.heroSub}>{m.aboutLead}</p>
          <span aria-hidden="true" className={styles.heroRule} />
          <p className={styles.aboutOwnerLine} data-testid="about-owner-name">
            {ownerName} · {ownerTitle}
          </p>
        </div>
        <div className={styles.aboutHeroPhoto} data-testid="about-owner-photo">
          <SmartImage
            src={owner.photoPath}
            alt={`${ownerName} · ${ownerTitle}`}
            ratio="4 / 5"
            preload
            wrapperClassName={styles.aboutHeroImage}
            sizes="(max-width: 900px) 100vw, 45vw"
            style={{ objectPosition: 'center 15%' }}
          />
        </div>
      </section>

      <Section testId="about-quote" tone="cream" pattern align="center">
        <Reveal>
          <blockquote className={styles.aboutQuote} data-testid="about-quote-text">
            <p>{phrases(m.aboutQuote)}</p>
            <cite className={styles.aboutQuoteBy}>
              {ownerName} · {ownerTitle}
            </cite>
          </blockquote>
        </Reveal>
      </Section>

      <Section testId="about-story">
        <div className={styles.storyRows}>
          <Reveal className={styles.storyRow}>
            <figure className={styles.storyFigure} data-testid="about-interview-photo">
              <SmartImage src="/brand/shop/owner-interview.jpg" alt={m.aboutStoryOneCaption} ratio="3 / 2" rounded zoom sizes="(max-width: 860px) 100vw, 640px" />
              <figcaption className={styles.storyCaption}>{m.aboutStoryOneCaption}</figcaption>
            </figure>
            <div className={styles.storyText} data-testid="about-story-feel">
              <h2>{m.aboutStoryOneTitle}</h2>
              <p>{m.aboutStoryOneBody}</p>
            </div>
          </Reveal>
          <Reveal className={`${styles.storyRow} ${styles.storyRowReverse}`}>
            <figure className={styles.storyFigure} data-testid="about-herbs-photo">
              <SmartImage src="/brand/shop/owner-herbs.jpg" alt={m.aboutStoryTwoCaption} ratio="3 / 2" rounded zoom sizes="(max-width: 860px) 100vw, 640px" />
              <figcaption className={styles.storyCaption}>{m.aboutStoryTwoCaption}</figcaption>
            </figure>
            <div className={styles.storyText} data-testid="about-story-herbs">
              <h2>{m.aboutStoryTwoTitle}</h2>
              <p>{m.aboutStoryTwoBody}</p>
              <LinkButton testId="about-herbs-link" href={`/${locale}/herbs`} variant="ghost">
                {c.navHerbs}
              </LinkButton>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section testId="about-promises" tone="forest" pattern eyebrow={m.aboutPromisesEyebrow} title={m.aboutPromisesTitle}>
        <div className={styles.promiseGrid}>
          {promises.map((p, i) => (
            <Reveal key={p.id} delay={i * 90} className={styles.promise}>
              <div data-testid={`about-promise-${p.id}`}>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section testId="about-visit">
        <div className={styles.visit}>
          <div className={styles.visitText}>
            <p className="eyebrow">{m.aboutVisitEyebrow}</p>
            <h2>{m.aboutVisitTitle}</h2>
          </div>
          <dl className={styles.visitFacts}>
            <div>
              <dt>{c.footerHoursLabel}</dt>
              <dd data-testid="about-hours">{c.footerHours}</dd>
            </div>
            <div>
              <dt>{c.footerContactLabel}</dt>
              <dd>
                <a href="tel:021234567" data-testid="about-phone" className={styles.visitPhone}>
                  {c.footerPhone}
                </a>
              </dd>
            </div>
          </dl>
          <div className={styles.visitActions}>
            <LinkButton testId="about-book-link" href={`/${locale}/booking`}>
              {c.book}
            </LinkButton>
            <LinkButton testId="about-team-link" href={`/${locale}/team`} variant="ghost">
              {c.navTeam}
            </LinkButton>
            <LinkButton testId="about-gallery-link" href={`/${locale}/gallery`} variant="ghost">
              {c.navGallery}
            </LinkButton>
          </div>
        </div>
      </Section>
    </>
  );
}

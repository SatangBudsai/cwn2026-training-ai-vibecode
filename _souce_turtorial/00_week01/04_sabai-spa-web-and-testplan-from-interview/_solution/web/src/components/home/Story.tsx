import { LinkButton, Parallax, Reveal, Section, SmartImage } from '@/components/ui';
import { f1 } from '@/i18n/f1';
import type { Locale } from '@/types';
import styles from './home.module.css';

export function Story({ locale }: { locale: Locale }) {
  const m = f1[locale];
  return (
    <Section id="home-story" testId="home-story" className={styles.roomy}>
      <div className={styles.storyGrid}>
        <Reveal className={styles.storyPhotos}>
          <SmartImage
            src="/brand/people/owner-chan.jpg"
            alt={m.storyAltOwner}
            ratio="4 / 5"
            rounded
            sizes="(min-width: 1240px) 600px, (min-width: 900px) 50vw, 100vw"
            style={{ objectPosition: '50% 12%' }}
            wrapperClassName={styles.storyMain}
          />
          <Parallax strength={28} className={styles.storyInset}>
            <SmartImage src="/brand/shop/owner-herbs.jpg" alt={m.storyAltHerbs} ratio="3 / 2" rounded sizes="(min-width: 900px) 320px, 56vw" />
          </Parallax>
        </Reveal>

        <div className={styles.storyText}>
          <Reveal>
            <p className="eyebrow">{m.storyEyebrow}</p>
            <h2 className={styles.headTitle}>
              {/* ตัดบรรทัดตรงช่องว่างเท่านั้น ภาษาไทยจึงไม่ขาดกลางวลี */}
              {m.storyTitle.split(' ').map((part) => (
                <span key={part} className={styles.noBreakPart}>
                  {part}{' '}
                </span>
              ))}
            </h2>
            <span aria-hidden="true" className={styles.ornament} />
          </Reveal>
          <Reveal delay={80} as="figure" className={styles.storyQuoteBox}>
            <blockquote className={styles.storyQuote}>
              {m.storyQuote.split(' ').map((part, i) => (
                <span key={i} className={styles.noBreakPart}>
                  {part}{' '}
                </span>
              ))}
            </blockquote>
            <figcaption className={styles.storySign}>
              {m.storyOwnerName} · {m.storyOwnerRole}
            </figcaption>
          </Reveal>
          <Reveal delay={140} className={styles.storyBody}>
            <p>{m.storyP1}</p>
            <p>{m.storyP2}</p>
            <p>{m.storyP3}</p>
          </Reveal>
          <Reveal delay={200} className={styles.buttonRow}>
            <LinkButton testId="home-story-about" href={`/${locale}/about`}>
              {m.storyAbout}
            </LinkButton>
            <LinkButton testId="home-story-herbs" href={`/${locale}/herbs`} variant="ghost">
              {m.storyHerbs}
            </LinkButton>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

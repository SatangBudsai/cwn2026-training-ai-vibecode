'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ErrorMessage, LinkButton, SmartImage, ThaiPattern } from '@/components/ui';
import { f8 } from '@/i18n/f8';
import { format, pick } from '@/i18n/locales';
import { api } from '@/lib/api-client';
import type { Locale, Mood, MoodRequest, MoodResponse } from '@/types';
import { priceText } from './price';
import { toUiError, type UiError } from './ui-error';
import styles from './mood.module.css';

export interface MoodPickerProps {
  locale: Locale;
  /** section = กล่องใหญ่บนหน้าแรก · page = หน้า /mood */
  variant?: 'section' | 'page';
}

/** อารมณ์มี 3 แบบเท่านั้นตาม FR-68 */
const MOODS: readonly {
  id: Mood;
  image: string;
  /** ให้จุดเล่าเรื่องของภาพอยู่ในกรอบเมื่อครอปแนวตั้ง */
  position: string;
  label: 'moodTired' | 'moodStress' | 'moodAchy';
  hint: 'moodTiredHint' | 'moodStressHint' | 'moodAchyHint';
  alt: 'moodTiredAlt' | 'moodStressAlt' | 'moodAchyAlt';
}[] = [
  { id: 'tired', image: '/brand/misc/mood-tired.jpg', position: '42% 70%', label: 'moodTired', hint: 'moodTiredHint', alt: 'moodTiredAlt' },
  { id: 'stress', image: '/brand/misc/mood-stress.jpg', position: '48% 25%', label: 'moodStress', hint: 'moodStressHint', alt: 'moodStressAlt' },
  { id: 'achy', image: '/brand/misc/mood-achy.jpg', position: '42% 25%', label: 'moodAchy', hint: 'moodAchyHint', alt: 'moodAchyAlt' },
];

export function MoodPicker({ locale, variant = 'page' }: MoodPickerProps) {
  const m = f8[locale];
  const [selected, setSelected] = useState<Mood | null>(null);
  const [result, setResult] = useState<MoodResponse | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => inFlight.current?.abort(), []);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ block: 'nearest' });
  }, [result]);

  const choose = async (mood: Mood) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setSelected(mood);
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const body: MoodRequest = { mood };
      const res = await api<MoodResponse>('/api/mood', { locale, body, signal: controller.signal });
      if (controller.signal.aborted) return;
      setResult(res);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(toUiError(e, m.errorNetwork));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const picker = (
    <>
      <div className={styles.cards}>
        {MOODS.map((mood) => (
          <button
            key={mood.id}
            type="button"
            className={selected === mood.id ? `${styles.card} ${styles.cardOn}` : styles.card}
            data-testid={`mood-${mood.id}`}
            aria-pressed={selected === mood.id}
            onClick={() => void choose(mood.id)}
          >
            <Image
              src={mood.image}
              alt={m[mood.alt]}
              fill
              sizes="(max-width: 760px) calc(100vw - 32px), 400px"
              className={styles.cardImage}
              style={{ objectPosition: mood.position }}
            />
            <span aria-hidden="true" className={styles.cardShade} />
            <span className={styles.cardText}>
              <span className={styles.cardLabel}>{m[mood.label]}</span>
              <span className={styles.cardHint}>{m[mood.hint]}</span>
            </span>
          </button>
        ))}
      </div>

      <div className={styles.status} aria-live="polite">
        {loading && (
          <p className={styles.loading} data-testid="mood-loading">
            {m.moodLoading}
          </p>
        )}
        {error && (
          <div data-testid="mood-error">
            <ErrorMessage code={error.code} message={error.message} />
          </div>
        )}
        {result && (
          <div ref={resultRef} className={styles.result} data-testid="mood-result" data-mood={result.mood} data-service={result.serviceId}>
            <SmartImage src={result.service.imagePath} alt={pick(result.service.name, locale)} sizes="(max-width: 760px) calc(100vw - 32px), 460px" ratio="4 / 3" wrapperClassName={styles.resultImage} />
            <div className={styles.resultBody}>
              <p className="eyebrow">{m.recommended}</p>
              <h3 data-testid="mood-service-name">{pick(result.service.name, locale)}</h3>
              <p data-testid="mood-reason">{pick(result.reason, locale)}</p>
              <p className={styles.price}>
                <strong data-testid="mood-price">{priceText(result.service.price, locale)}</strong>
                <span>
                  {m.perPerson} · {format(m.minutes, { n: result.service.durationMinutes })}
                </span>
              </p>
              <LinkButton testId="mood-book" href={`/${locale}/booking?service=${result.serviceId}`} variant="gold">
                {m.bookThis}
              </LinkButton>
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (variant === 'page') {
    return <div className={styles.page}>{picker}</div>;
  }

  return (
    <section className={styles.section} data-testid="mood-section">
      <ThaiPattern tone="dark" />
      <div className={`container ${styles.sectionInner}`}>
        <header className={styles.sectionHead}>
          <p className="eyebrow">{m.moodEyebrow}</p>
          <h2 data-testid="mood-heading">{m.moodHeading}</h2>
          <span aria-hidden="true" className={styles.rule} />
          <p className={styles.lead}>{m.moodLead}</p>
        </header>
        {picker}
      </div>
    </section>
  );
}

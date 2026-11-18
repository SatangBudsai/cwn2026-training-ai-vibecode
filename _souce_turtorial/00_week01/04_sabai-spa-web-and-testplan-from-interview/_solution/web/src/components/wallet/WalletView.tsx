'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ErrorMessage, Reveal, Section, ThaiPattern } from '@/components/ui';
import { common } from '@/i18n/common';
import { f6 } from '@/i18n/f6';
import { pick } from '@/i18n/locales';
import { api, ApiClientError } from '@/lib/api-client';
import type { CourseSummary, Locale, Service, ServicesResponse, WalletResponse } from '@/types';
import { BodyPhotos } from './BodyPhotos';
import { BuyCourse } from './BuyCourse';
import { CourseCard } from './CourseCard';
import { EmptyState } from './EmptyState';
import { GiftCards } from './GiftCards';
import { WaistChart } from './WaistChart';
import styles from './wallet.module.css';

interface ShownError {
  code: string;
  message: string;
}

export function WalletView({ locale }: { locale: Locale }) {
  const m = f6[locale];
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [loadError, setLoadError] = useState<ShownError | null>(null);
  const [k01, setK01] = useState<Service | null>(null);
  const [priceError, setPriceError] = useState<ShownError | null>(null);

  const toLogin = useCallback(() => {
    router.replace(`/${locale}/login?next=/${locale}/wallet`);
  }, [router, locale]);

  const toShownError = useCallback(
    (err: unknown): ShownError =>
      err instanceof ApiClientError ? { code: err.code, message: err.message } : { code: 'internal', message: m.genericError },
    [m.genericError],
  );

  useEffect(() => {
    const ac = new AbortController();
    api<WalletResponse>('/api/wallet', { locale, signal: ac.signal })
      .then(setWallet)
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        if (err instanceof ApiClientError && err.status === 401) toLogin();
        else setLoadError(toShownError(err));
      });
    // ราคาคอร์สอ่านจาก API เท่านั้น
    api<ServicesResponse>('/api/services', { locale, signal: ac.signal })
      .then((res) => {
        const found = res.services.find((s) => s.id === 'K01');
        if (found) setK01(found);
        else setPriceError({ code: 'service-not-found', message: m.priceUnavailable });
      })
      .catch((err: unknown) => {
        if (!ac.signal.aborted) setPriceError({ code: toShownError(err).code, message: m.priceUnavailable });
      });
    return () => ac.abort();
  }, [locale, m.priceUnavailable, toLogin, toShownError]);

  const onPurchased = useCallback(
    (course: CourseSummary) => {
      // API เรียงคอร์สล่าสุดก่อน
      setWallet((prev) => prev && { ...prev, courses: [course, ...prev.courses] });
      // อ่านซ้ำเพื่อให้ลำดับตรงกับ API · อ่านไม่สำเร็จก็ยังเห็นคอร์สใหม่จากคำตอบการซื้อ
      api<WalletResponse>('/api/wallet', { locale })
        .then(setWallet)
        .catch(() => {});
    },
    [locale],
  );

  return (
    <div data-testid="wallet-page">
      <header className={styles.hero}>
        <ThaiPattern tone="light" />
        <div className={`container ${styles.heroInner}`}>
          <p className="eyebrow">{m.walletEyebrow}</p>
          <h1>{m.walletTitle}</h1>
          <p className={styles.heroIntro}>{m.walletIntro}</p>
          <Link href={`/${locale}/account/history`} className={styles.heroLink} data-testid="wallet-history-link">
            {m.historyLink}
          </Link>
        </div>
      </header>

      {loadError && (
        <div className={`container ${styles.status}`}>
          <ErrorMessage code={loadError.code} message={loadError.message} />
        </div>
      )}
      {!wallet && !loadError && (
        <p role="status" className={`container ${styles.status}`} data-testid="wallet-loading">
          {common[locale].loading}
        </p>
      )}

      {wallet && (
        <>
          <Section testId="wallet-courses" eyebrow={m.coursesEyebrow} title={m.coursesTitle}>
            <div className={styles.courseLayout}>
              <div className={styles.courseList}>
                {wallet.courses.length === 0 ? (
                  <EmptyState locale={locale} testId="wallet-courses-empty" title={m.coursesEmptyTitle} body={m.coursesEmptyBody} />
                ) : (
                  wallet.courses.map((course, index) => <CourseCard key={course.id} course={course} index={index} locale={locale} />)
                )}
              </div>
              <BuyCourse
                locale={locale}
                price={k01?.price ?? null}
                name={k01 ? pick(k01.name, locale) : m.courseFallbackName}
                priceError={priceError}
                onPurchased={onPurchased}
                onUnauthorized={toLogin}
              />
            </div>
          </Section>

          {(wallet.waist.points.length > 0 || wallet.photos.length > 0) && (
            <Section testId="wallet-results" tone="cream" eyebrow={m.resultsEyebrow} title={m.resultsTitle} subtitle={m.resultsNote}>
              <Reveal className={styles.resultsGrid}>
                {wallet.waist.points.length > 0 && (
                  <WaistChart locale={locale} points={wallet.waist.points} reducedCm={wallet.waist.reducedCm} />
                )}
                {wallet.photos.length > 0 && <BodyPhotos locale={locale} photos={wallet.photos} />}
              </Reveal>
            </Section>
          )}

          <Section testId="wallet-giftcards" eyebrow={m.giftEyebrow} title={m.giftTitle}>
            <GiftCards locale={locale} cards={wallet.giftCards} />
          </Section>
        </>
      )}
    </div>
  );
}

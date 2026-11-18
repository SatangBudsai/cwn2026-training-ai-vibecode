import type { Metadata } from 'next';
import { PageHero } from '@/components/people/PageHero';
import { TherapistCard } from '@/components/people/TherapistCard';
import { TherapistFilter } from '@/components/people/TherapistFilter';
import styles from '@/components/people/people.module.css';
import { Reveal } from '@/components/ui';
import { common } from '@/i18n/common';
import { f3 } from '@/i18n/f3';
import { parseLocale } from '@/i18n/locales';
import { listServices, listTherapists } from '@/lib/catalog';
import type { LocaleParams, LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  return { title: common[locale].navTherapists, description: f3[locale].therapistsSubtitle };
}

export default async function TherapistsPage({ params, searchParams }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  const m = f3[locale];
  const { filter } = await searchParams;
  const filterOn = filter === '4.5';

  // เกณฑ์และลำดับมาจาก catalog ทั้งหมด (BR-47–49, E222) หน้านี้ไม่คิดคะแนนเอง
  const [found, services] = await Promise.all([
    listTherapists(filterOn ? { minRating: 4.5 } : undefined),
    listServices(),
  ]);
  const therapists = filterOn ? found.filter((t) => t.passesFilter) : found;

  return (
    <>
      <PageHero testId="therapists-hero" eyebrow={m.therapistsEyebrow} title={m.therapistsTitle} subtitle={m.therapistsSubtitle} />
      <section className={styles.pageBody}>
        <div className="container">
          <TherapistFilter locale={locale} active={filterOn} count={therapists.length} />
          <div className={styles.therapistGrid} data-testid="therapists-grid">
            {therapists.map((t, i) => (
              <Reveal key={t.id} delay={(i % 3) * 90} className={styles.gridCell}>
                <TherapistCard therapist={t} services={services} locale={locale} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from 'next';
import { MoodPicker } from '@/components/widgets/MoodPicker';
import { PageIntro } from '@/components/widgets/PageIntro';
import { f8 } from '@/i18n/f8';
import { parseLocale } from '@/i18n/locales';
import type { LocalePageProps } from '@/types';
import styles from '@/components/widgets/mood.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Pick<LocalePageProps, 'params'>): Promise<Metadata> {
  const m = f8[parseLocale((await params).locale)];
  return { title: m.moodTitle, description: m.moodSubtitle };
}

export default async function MoodPage({ params }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  const m = f8[locale];
  return (
    <>
      <PageIntro testId="mood-intro" titleTestId="mood-title" eyebrow={m.moodEyebrow} title={m.moodTitle} subtitle={m.moodSubtitle} image="/brand/shop/garden-sala.jpg" />
      <div className={styles.pageWrap}>
        <div className="container">
          <MoodPicker locale={locale} variant="page" />
        </div>
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import { QuizClient } from '@/components/quiz/QuizClient';
import { PageIntro } from '@/components/widgets/PageIntro';
import { f8 } from '@/i18n/f8';
import { parseLocale } from '@/i18n/locales';
import type { LocalePageProps } from '@/types';
import styles from '@/components/quiz/quiz.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Pick<LocalePageProps, 'params'>): Promise<Metadata> {
  const m = f8[parseLocale((await params).locale)];
  return { title: m.quizTitle, description: m.quizSubtitle };
}

export default async function QuizPage({ params }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  const m = f8[locale];
  return (
    <>
      <PageIntro testId="quiz-intro" titleTestId="quiz-title" eyebrow={m.quizEyebrow} title={m.quizTitle} subtitle={m.quizSubtitle} image="/brand/shop/herb-bar.jpg" />
      <div className={styles.wrap}>
        <div className={`container ${styles.narrow}`}>
          <QuizClient locale={locale} />
        </div>
      </div>
    </>
  );
}

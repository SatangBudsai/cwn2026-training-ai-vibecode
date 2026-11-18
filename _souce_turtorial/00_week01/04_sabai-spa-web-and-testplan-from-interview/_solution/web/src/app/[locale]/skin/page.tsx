import type { Metadata } from 'next';
import { SkinAnalyzer } from '@/components/skin/SkinAnalyzer';
import { PageIntro } from '@/components/widgets/PageIntro';
import { f8 } from '@/i18n/f8';
import { parseLocale } from '@/i18n/locales';
import { isSkinPreviewEnabled } from '@/lib/env';
import type { LocalePageProps } from '@/types';
import styles from '@/components/skin/skin.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Pick<LocalePageProps, 'params'>): Promise<Metadata> {
  const m = f8[parseLocale((await params).locale)];
  return { title: m.skinTitle, description: m.skinSubtitle };
}

export default async function SkinPage({ params }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  const m = f8[locale];
  return (
    <>
      <PageIntro testId="skin-intro" titleTestId="skin-title" eyebrow={m.skinEyebrow} title={m.skinTitle} subtitle={m.skinSubtitle} image="/brand/shop/herbal-steam.jpg" />
      <div className={styles.wrap}>
        <div className="container">
          <SkinAnalyzer locale={locale} previewEnabled={isSkinPreviewEnabled()} />
        </div>
      </div>
    </>
  );
}

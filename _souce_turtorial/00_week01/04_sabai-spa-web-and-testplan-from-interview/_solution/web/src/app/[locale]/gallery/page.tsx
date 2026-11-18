import type { Metadata } from 'next';
import { GalleryMasonry } from '@/components/people/GalleryMasonry';
import { PageHero } from '@/components/people/PageHero';
import styles from '@/components/people/people.module.css';
import { LinkButton } from '@/components/ui';
import { common } from '@/i18n/common';
import { f3 } from '@/i18n/f3';
import { parseLocale } from '@/i18n/locales';
import type { LocaleParams, LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  return { title: common[locale].navGallery, description: f3[locale].gallerySubtitle };
}

export default async function GalleryPage({ params }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  const m = f3[locale];

  return (
    <>
      <PageHero testId="gallery-hero" eyebrow={m.galleryEyebrow} title={m.galleryTitle} subtitle={m.gallerySubtitle} />
      <section className={styles.pageBody}>
        <div className="container">
          <GalleryMasonry locale={locale} />
          <div className={styles.galleryFoot}>
            <LinkButton testId="gallery-tour-link" href={`/${locale}/tour`} variant="ghost">
              {common[locale].navTour}
            </LinkButton>
            <LinkButton testId="gallery-book-link" href={`/${locale}/booking`}>
              {common[locale].book}
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}

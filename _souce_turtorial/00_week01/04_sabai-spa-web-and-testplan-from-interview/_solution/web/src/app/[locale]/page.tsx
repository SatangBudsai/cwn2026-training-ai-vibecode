import { ClosingBand } from '@/components/home/ClosingBand';
import { FeaturedServices, PackageFeature } from '@/components/home/FeaturedServices';
import { Gallery } from '@/components/home/Gallery';
import { Hero } from '@/components/home/Hero';
import { MoodSection } from '@/components/home/MoodSection';
import { Reviews } from '@/components/home/Reviews';
import { Stats } from '@/components/home/Stats';
import { Story } from '@/components/home/Story';
import { TherapistRow } from '@/components/home/TherapistRow';
import { LOCALES, parseLocale } from '@/i18n/locales';
import { listHerbs, listServices, listTherapists } from '@/lib/catalog';
import type { LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export default async function HomePage({ params }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  const [services, herbs, therapists] = await Promise.all([listServices(), listHerbs(), listTherapists()]);
  const relax = services.find((s) => s.id === 'P01');

  return (
    <>
      <Hero locale={locale} />
      <Story locale={locale} />
      <Stats locale={locale} services={services.length} herbs={herbs.length} therapists={therapists.length} languages={LOCALES.length} />
      <FeaturedServices locale={locale} services={services} />
      {relax && <PackageFeature locale={locale} service={relax} />}
      <MoodSection locale={locale} />
      <TherapistRow locale={locale} therapists={therapists} services={services} />
      <Gallery locale={locale} />
      <Reviews locale={locale} />
      <ClosingBand locale={locale} />
    </>
  );
}

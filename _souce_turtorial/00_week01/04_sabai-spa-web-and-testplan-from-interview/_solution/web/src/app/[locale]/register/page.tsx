import type { Metadata } from 'next';
import { AuthShell } from '@/components/account/AuthShell';
import { safeNext } from '@/components/account/helpers';
import { RegisterForm } from '@/components/account/RegisterForm';
import { f5 } from '@/i18n/f5';
import { parseLocale } from '@/i18n/locales';
import type { LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  return { title: f5[parseLocale(locale)].registerTitle };
}

export default async function RegisterPage({ params, searchParams }: LocalePageProps) {
  const [{ locale: raw }, query] = await Promise.all([params, searchParams]);
  const locale = parseLocale(raw);
  const m = f5[locale];
  return (
    <AuthShell eyebrow={m.registerEyebrow} title={m.registerTitle} subtitle={m.registerSub} quote={m.registerQuote} imageAlt={m.sideAlt}>
      <RegisterForm locale={locale} next={safeNext(query.next)} />
    </AuthShell>
  );
}

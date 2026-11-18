import type { Metadata } from 'next';
import { AuthShell } from '@/components/account/AuthShell';
import { safeNext } from '@/components/account/helpers';
import { LoginForm } from '@/components/account/LoginForm';
import { f5 } from '@/i18n/f5';
import { parseLocale } from '@/i18n/locales';
import type { LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  return { title: f5[parseLocale(locale)].loginTitle };
}

export default async function LoginPage({ params, searchParams }: LocalePageProps) {
  const [{ locale: raw }, query] = await Promise.all([params, searchParams]);
  const locale = parseLocale(raw);
  const m = f5[locale];
  return (
    <AuthShell eyebrow={m.loginEyebrow} title={m.loginTitle} subtitle={m.loginSub} quote={m.loginQuote} imageAlt={m.sideAlt}>
      <LoginForm locale={locale} next={safeNext(query.next)} />
    </AuthShell>
  );
}

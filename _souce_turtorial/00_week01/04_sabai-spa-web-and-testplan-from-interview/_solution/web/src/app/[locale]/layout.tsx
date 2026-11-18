import type { Metadata, Viewport } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import '@fontsource/trirong/thai-400.css';
import '@fontsource/trirong/latin-400.css';
import '@fontsource/trirong/thai-500.css';
import '@fontsource/trirong/latin-500.css';
import '@fontsource/sarabun/thai-400.css';
import '@fontsource/sarabun/latin-400.css';
import '@fontsource/sarabun/thai-500.css';
import '@fontsource/sarabun/latin-500.css';
import '../globals.css';
import { FloatingBook } from '@/components/layout/FloatingBook';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ReadyFlag } from '@/components/layout/ReadyFlag';
import { TestPanel } from '@/components/layout/TestPanel';
import { ChatWidget } from '@/components/widgets/ChatWidget';
import { MusicToggle } from '@/components/widgets/MusicToggle';
import { common } from '@/i18n/common';
import { isLocale } from '@/i18n/locales';
import { isTestMode, runtimeProfile } from '@/lib/env';
import { getSession } from '@/lib/session';

// อ่าน env และ cookie ตอนรัน จึงไม่ prerender ทั้งเว็บ
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#16291f',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const m = isLocale(locale) ? common[locale] : common.th;
  return {
    title: { default: `${m.brandName} · ${m.brandTagline}`, template: `%s · ${m.brandName}` },
    description: m.footerAbout,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect('/th');
  const session = await getSession();
  const m = common[locale];

  return (
    <html lang={locale} data-ready="false" data-bug-mode={runtimeProfile()} suppressHydrationWarning>
      <body>
        <ReadyFlag />
        <a href="#main" className="skip-link" data-testid="header-skip-link">
          {m.skipToContent}
        </a>
        <Header locale={locale} role={session?.role ?? null} musicSlot={<MusicToggle locale={locale} />} />
        <main id="main">{children}</main>
        <Footer locale={locale} />
        {isTestMode() && <TestPanel locale={locale} />}
        <FloatingBook locale={locale} />
        <ChatWidget locale={locale} />
      </body>
    </html>
  );
}

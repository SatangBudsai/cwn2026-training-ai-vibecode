'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { LinkButton } from '@/components/ui';
import { common } from '@/i18n/common';
import { LOCALES } from '@/i18n/locales';
import type { Locale, Role } from '@/types';
import styles from './layout.module.css';

const LANG_LABEL: Record<Locale, string> = { th: 'TH', en: 'EN', zh: '中文' };
const LANG_ARIA: Record<Locale, string> = { th: 'ไทย', en: 'English', zh: '中文' };

export interface HeaderProps {
  locale: Locale;
  role: Role | null;
  musicSlot: ReactNode;
}

export function Header({ locale, role, musicSlot }: HeaderProps) {
  const m = common[locale];
  const pathname = usePathname();
  const search = useSearchParams();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const isHome = pathname === `/${locale}`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const qs = search.toString();
  const langHref = (target: Locale) => {
    const rest = pathname.replace(/^\/(th|en|zh)(?=\/|$)/, '');
    return `/${target}${rest}${qs ? `?${qs}` : ''}`;
  };
  const href = (path: string) => `/${locale}${path}`;

  const transparent = isHome && !scrolled && !open;
  const cls = [styles.header, isHome ? styles.headerFixed : styles.headerSticky, transparent ? styles.headerClear : styles.headerSolid].join(' ');

  const links: { key: string; path: string; label: string }[] = [
    { key: 'services', path: '/services', label: m.navServices },
    { key: 'package', path: '/packages/bangkok-relax', label: m.navPackage },
    { key: 'therapists', path: '/therapists', label: m.navTherapists },
    { key: 'gift-cards', path: '/gift-cards', label: m.navGiftCards },
    { key: 'about', path: '/about', label: m.navAbout },
  ];

  return (
    <header className={cls} data-testid="header">
      <div className={`container ${styles.headerRow}`}>
        <Link href={href('')} className={styles.logo} data-testid="header-logo" aria-label={m.brandName}>
          <svg aria-hidden="true" viewBox="0 0 64 64" width="30" height="30" className={styles.logoMark}>
            <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round">
              <path d="M32 12c7 8 7 19 0 30-7-11-7-22 0-30Z" />
              <path d="M32 42c-3-9-10-15-20-17 0 11 9 18 20 17Z" />
              <path d="M32 42c3-9 10-15 20-17 0 11-9 18-20 17Z" />
              <path d="M16 50h32" />
            </g>
          </svg>
          <span className={styles.logoText}>{m.brandName}</span>
        </Link>

        <nav id="header-nav" className={`${styles.nav} ${open ? styles.navOpen : ''}`} aria-label={m.menuOpen}>
          {links.map((l) => (
            <Link key={l.key} href={href(l.path)} className={styles.navLink} data-testid={`header-nav-${l.key}`} aria-current={pathname.startsWith(href(l.path)) ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
          {role === 'OWNER' && (
            <Link href={href('/admin')} className={styles.navLink} data-testid="header-admin">
              {m.admin}
            </Link>
          )}
          {role === 'CUSTOMER' && (
            <Link href={href('/wallet')} className={styles.navLink} data-testid="header-wallet">
              {m.wallet}
            </Link>
          )}
          {role ? (
            <Link href={href('/account')} className={styles.navLink} data-testid="header-account">
              {m.account}
            </Link>
          ) : (
            <Link href={href('/login')} className={styles.navLink} data-testid="header-login">
              {m.login}
            </Link>
          )}
        </nav>

        <div className={styles.actions}>
          {musicSlot}
          <div className={styles.lang} role="group" aria-label={m.switchLanguage}>
            {LOCALES.map((l) => (
              <Link key={l} href={langHref(l)} lang={l} className={l === locale ? styles.langActive : styles.langLink} data-testid={`header-lang-${l}`} aria-label={locale === 'zh' && l === 'th' ? '泰语' : LANG_ARIA[l]} aria-current={l === locale ? 'true' : undefined} scroll={false}>
                {LANG_LABEL[l]}
              </Link>
            ))}
          </div>
          <LinkButton testId="header-book" href={href('/booking')} variant="gold" size="sm" className={styles.bookBtn}>
            {m.book}
          </LinkButton>
          <button type="button" className={styles.menuBtn} data-testid="header-menu-toggle" aria-expanded={open} aria-controls="header-nav" aria-label={open ? m.menuClose : m.menuOpen} onClick={() => setOpen((v) => !v)}>
            <span aria-hidden="true" className={open ? styles.menuIconOpen : styles.menuIcon} />
          </button>
        </div>
      </div>
    </header>
  );
}

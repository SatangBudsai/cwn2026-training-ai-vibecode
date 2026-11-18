import Link from 'next/link';
import { ThaiPattern } from '@/components/ui';
import { common } from '@/i18n/common';
import type { Locale } from '@/types';
import styles from './layout.module.css';

export function Footer({ locale }: { locale: Locale }) {
  const m = common[locale];
  const href = (path: string) => `/${locale}${path}`;
  const explore: [string, string, string][] = [
    ['services', '/services', m.navServices],
    ['herbs', '/herbs', m.navHerbs],
    ['package', '/packages/bangkok-relax', m.navPackage],
    ['therapists', '/therapists', m.navTherapists],
    ['team', '/team', m.navTeam],
    ['reviews', '/reviews', m.navReviews],
    ['gallery', '/gallery', m.navGallery],
    ['about', '/about', m.navAbout],
  ];
  const tools: [string, string, string][] = [
    ['tour', '/tour', m.navTour],
    ['quiz', '/quiz', m.navQuiz],
    ['skin', '/skin', m.navSkin],
    ['shuttle', '/shuttle', m.navShuttle],
    ['gift-cards', '/gift-cards', m.navGiftCards],
    ['account', '/account', m.account],
    ['cancel', '/booking/cancel', m.footerCancel],
  ];

  return (
    <footer className={styles.footer} data-testid="footer">
      <ThaiPattern tone="light" />
      <div className={`container ${styles.footerGrid}`}>
        <div className={styles.footerBrand}>
          <p className={styles.footerName}>{m.brandName}</p>
          <p className={styles.footerTagline}>{m.brandTagline}</p>
          <p>{m.footerAbout}</p>
        </div>
        <div>
          <p className={styles.footerHead}>{m.footerHoursLabel}</p>
          <p>{m.footerHours}</p>
          <p className={styles.footerHead}>{m.footerContactLabel}</p>
          <a className={styles.footerPhone} href="tel:021234567" data-testid="footer-phone">
            {m.footerPhone}
          </a>
        </div>
        <nav aria-label={m.footerExplore}>
          <p className={styles.footerHead}>{m.footerExplore}</p>
          <ul className={styles.footerList}>
            {explore.map(([key, path, label]) => (
              <li key={key}>
                <Link href={href(path)} data-testid={`footer-link-${key}`}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={m.footerMembers}>
          <p className={styles.footerHead}>{m.footerMembers}</p>
          <ul className={styles.footerList}>
            {tools.map(([key, path, label]) => (
              <li key={key}>
                <Link href={href(path)} data-testid={`footer-link-${key}`}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className={`container ${styles.footerBottom}`}>
        <p>© {m.footerRights}</p>
        <p>{m.footerSample}</p>
      </div>
    </footer>
  );
}

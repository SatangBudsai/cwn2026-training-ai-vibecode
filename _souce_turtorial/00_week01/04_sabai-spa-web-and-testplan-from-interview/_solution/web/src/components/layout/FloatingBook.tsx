'use client';
import { usePathname } from 'next/navigation';
import { LinkButton } from '@/components/ui';
import { common } from '@/i18n/common';
import type { Locale } from '@/types';
import styles from './layout.module.css';

/** ปุ่มจองคิวลอยบนมือถือ อยู่ซ้ายล่าง ไม่บังแชตที่อยู่ขวาล่าง */
export function FloatingBook({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  if (pathname.startsWith(`/${locale}/booking`) || pathname.startsWith(`/${locale}/admin`)) return null;
  return (
    <div className={styles.floatingBook}>
      <LinkButton testId="floating-book" href={`/${locale}/booking`} variant="gold">
        {common[locale].book}
      </LinkButton>
    </div>
  );
}

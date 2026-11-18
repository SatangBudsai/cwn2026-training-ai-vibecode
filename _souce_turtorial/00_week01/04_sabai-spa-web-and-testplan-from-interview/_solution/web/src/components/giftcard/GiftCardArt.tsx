import type { ReactNode } from 'react';
import { SmartImage } from '@/components/ui';
import type { GiftCardDesign } from '@/types';
import styles from './giftcard.module.css';

export const DESIGN_IMAGES: Record<GiftCardDesign, string> = {
  ORCHID: '/brand/giftcard/gc-orchid.jpg',
  LOTUS: '/brand/giftcard/gc-lotus.jpg',
  GOLD: '/brand/giftcard/gc-gold.jpg',
};

export interface GiftCardArtProps {
  design: GiftCardDesign;
  alt: string;
  sizes: string;
  brand: string;
  label: string;
  /** ข้อความใหญ่กลางการ์ด: มูลค่า */
  value: ReactNode;
  /** บรรทัดเล็กใต้มูลค่า เช่น รหัสบัตร */
  caption?: string;
  priority?: boolean;
  className?: string;
}

/** รูปบัตรจริงพร้อมข้อความกลางการ์ด · ขนาดตัวอักษรตามความกว้างการ์ดด้วย container query */
export function GiftCardArt({ design, alt, sizes, brand, label, value, caption, priority, className }: GiftCardArtProps) {
  const cls = [styles.art, design === 'ORCHID' ? styles.artInkDark : styles.artInkLight, className].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <SmartImage src={DESIGN_IMAGES[design]} alt={alt} sizes={sizes} ratio="3 / 2" priority={priority} />
      <div className={styles.artText}>
        <span className={styles.artBrand}>{brand}</span>
        <span className={styles.artValue}>{value}</span>
        <span className={styles.artLabel}>{caption ?? label}</span>
      </div>
    </div>
  );
}

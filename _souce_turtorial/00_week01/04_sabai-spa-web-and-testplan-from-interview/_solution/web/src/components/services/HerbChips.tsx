import { SmartImage } from '@/components/ui';
import { f2 } from '@/i18n/f2';
import { pick } from '@/i18n/locales';
import type { Herb, Locale } from '@/types';
import { imageSrc } from './helpers';
import styles from './services.module.css';

export interface HerbChipsProps {
  herbs: Herb[];
  locale: Locale;
  /** กล่องรายการ */
  testId: string;
  /** เช่น service-herb-S01 → service-herb-S01-1 */
  itemTestIdPrefix: string;
  tone?: 'dark' | 'light';
}

/** รายชื่อสมุนไพรพร้อมรูปเล็ก · แสดงชื่ออย่างเดียวตาม FR-64 */
export function HerbChips({ herbs, locale, testId, itemTestIdPrefix, tone = 'dark' }: HerbChipsProps) {
  return (
    <div className={tone === 'light' ? styles.chipsLight : styles.chips}>
      <p className={styles.chipsLabel}>{f2[locale].herbsLabel}</p>
      <ul data-testid={testId} className={styles.chipList}>
        {herbs.map((herb) => {
          const name = pick(herb.name, locale);
          return (
            <li key={herb.id} data-testid={`${itemTestIdPrefix}-${herb.id}`} className={styles.chip}>
              <SmartImage src={imageSrc(herb.imagePath)} alt="" ratio="1 / 1" sizes="32px" wrapperClassName={styles.chipImage} />
              <span>{name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

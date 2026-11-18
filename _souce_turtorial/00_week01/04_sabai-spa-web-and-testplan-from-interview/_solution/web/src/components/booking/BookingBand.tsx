import { ThaiPattern } from '@/components/ui';
import styles from './booking.module.css';

/** แถบหัวหน้าเตี้ย ๆ สีป่าเข้ม · ไม่กินพื้นที่ขั้นตอนจองบนมือถือ */
export function BookingBand({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <header className={styles.band}>
      <ThaiPattern tone="light" />
      <div className={`container ${styles.bandInner}`}>
        <p className={styles.bandEyebrow}>{eyebrow}</p>
        <h1 className={styles.bandTitle}>{title}</h1>
        <p className={styles.bandSub}>{subtitle}</p>
      </div>
    </header>
  );
}

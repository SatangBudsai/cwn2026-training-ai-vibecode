import styles from './people.module.css';

const STAR_PATH =
  'M10 1.8l2.46 5.2 5.66.72-4.16 3.92 1.08 5.62L10 14.5l-5.04 2.76 1.08-5.62L1.88 7.72l5.66-.72L10 1.8Z';

function StarRow({ size }: { size: number }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} aria-hidden="true" viewBox="0 0 20 20" width={size} height={size} className={styles.starIcon}>
          <path d={STAR_PATH} fill="currentColor" />
        </svg>
      ))}
    </>
  );
}

export interface StarsProps {
  /** ค่าจาก API เท่านั้น: rating ปัดแล้ว หรือ stars ของรีวิวแต่ละรายการ */
  value: number;
  /** ข้อความสำหรับโปรแกรมอ่านหน้าจอ */
  label: string;
  testId: string;
  size?: number;
  /** พื้นเข้มใช้สีทองอ่อน */
  tone?: 'light' | 'dark';
}

/** ดาว 5 ดวง ระบายทองตามสัดส่วนของ value · เป็นการแสดงผลอย่างเดียว ไม่ได้คำนวณคะแนน */
export function Stars({ value, label, testId, size = 18, tone = 'light' }: StarsProps) {
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  const cls = [styles.stars, tone === 'dark' && styles.starsDark].filter(Boolean).join(' ');
  return (
    <span role="img" aria-label={label} data-testid={testId} data-value={value} className={cls}>
      <span className={styles.starsBase}>
        <StarRow size={size} />
      </span>
      <span className={styles.starsFill} style={{ width: `${percent}%` }}>
        <StarRow size={size} />
      </span>
    </span>
  );
}

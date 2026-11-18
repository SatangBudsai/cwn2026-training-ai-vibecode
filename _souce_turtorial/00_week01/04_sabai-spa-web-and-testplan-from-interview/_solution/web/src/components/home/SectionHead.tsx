import { Reveal } from '@/components/ui';
import styles from './home.module.css';

export interface SectionHeadProps {
  eyebrow: string;
  title: string;
  lead?: string;
  center?: boolean;
  /** อยู่บนพื้นเขียวเข้ม */
  dark?: boolean;
}

/** หัวข้อของแต่ละส่วน: ตัวเซอริฟใหญ่ เส้นทองบาง ค่อย ๆ ปรากฏเมื่อเลื่อนถึง */
export function SectionHead({ eyebrow, title, lead, center, dark }: SectionHeadProps) {
  return (
    <Reveal className={center ? styles.headCenter : styles.head}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className={styles.headTitle}>{title}</h2>
      {lead && <p className={dark ? styles.headLeadDark : styles.headLead}>{lead}</p>}
      <span aria-hidden="true" className={styles.ornament} />
    </Reveal>
  );
}

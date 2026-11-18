import { errorTestId } from '@/lib/format';
import styles from './ui.module.css';

/** แสดงข้อความ error ของ API ด้วย data-testid="error-<code>" */
export function ErrorMessage({ code, message }: { code: string; message: string }) {
  return (
    <p role="alert" data-testid={errorTestId(code)} className={styles.error}>
      {message}
    </p>
  );
}

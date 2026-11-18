import { SmartImage } from '@/components/ui';
import { f8 } from '@/i18n/f8';
import type { Locale } from '@/types';
import styles from './skin.module.css';

/** ภาพจำลองก่อน/หลัง (FR-76) · ใช้ภาพตัวอย่างของร้านเท่านั้น ไม่รับรูปที่ผู้ใช้เลือก */
export function SkinPreview({ locale }: { locale: Locale }) {
  const m = f8[locale];
  return (
    <section className={styles.preview} data-testid="skin-preview">
      <h2 className={styles.previewTitle}>{m.skinPreviewTitle}</h2>
      <div className={styles.previewGrid}>
        <figure>
          <SmartImage src="/brand/misc/skin-sample.jpg" alt={m.skinPreviewBeforeAlt} sizes="(max-width: 860px) 50vw, 400px" ratio="4 / 5" rounded />
          <figcaption data-testid="skin-preview-before">{m.skinPreviewBefore}</figcaption>
        </figure>
        <figure>
          <SmartImage src="/brand/misc/mood-glow.jpg" alt={m.skinPreviewAfterAlt} sizes="(max-width: 860px) 50vw, 400px" ratio="4 / 5" rounded style={{ objectPosition: '58% 30%' }} />
          <figcaption data-testid="skin-preview-after">{m.skinPreviewAfter}</figcaption>
        </figure>
      </div>
      <p className={styles.previewNote} data-testid="skin-preview-note">
        {m.skinPreviewNote}
      </p>
    </section>
  );
}

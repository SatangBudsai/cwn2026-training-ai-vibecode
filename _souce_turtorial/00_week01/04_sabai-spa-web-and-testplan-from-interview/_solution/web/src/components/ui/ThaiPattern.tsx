import styles from './ui.module.css';

/** ลายไทยจาง ๆ เป็น SVG (กนกประจำยาม) · ไม่ใช่รูปคน */
export function ThaiPattern({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const color = tone === 'light' ? '#e2cd9b' : '#80652c';
  const id = `thai-pattern-${tone}`;
  return (
    <svg aria-hidden="true" className={styles.pattern} width="100%" height="100%">
      <defs>
        <pattern id={id} width="72" height="72" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={color} strokeWidth="0.8">
            <path d="M36 6c5 8 5 15 0 22-5-7-5-14 0-22ZM36 66c-5-8-5-15 0-22 5 7 5 14 0 22ZM6 36c8-5 15-5 22 0-7 5-14 5-22 0ZM66 36c-8 5-15 5-22 0 7-5 14-5 22 0Z" />
            <circle cx="36" cy="36" r="4" />
            <path d="M36 28l8 8-8 8-8-8Z" />
            <path d="M0 0l10 10M72 0 62 10M0 72l10-10M72 72 62 62" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

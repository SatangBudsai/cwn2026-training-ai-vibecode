/** The rice-bowl mark, same drawing as src/app/icon.svg (the favicon) */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <rect width="64" height="64" rx="14" fill="#19191b" />
      <rect x="1" y="1" width="62" height="62" rx="13" fill="none" stroke="#ededed" strokeOpacity="0.14" strokeWidth="2" />
      <path d="M38 9 L50 23" stroke="#a1a1a6" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M45 8 L53 22" stroke="#a1a1a6" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M15 28 Q32 19 49 28 Z" fill="#ededed" />
      <path d="M10 30 H54 C54 43 45 52 32 52 C19 52 10 43 10 30 Z" fill="#f0883e" />
      <rect x="23" y="51" width="18" height="4" rx="2" fill="#f0883e" />
    </svg>
  );
}

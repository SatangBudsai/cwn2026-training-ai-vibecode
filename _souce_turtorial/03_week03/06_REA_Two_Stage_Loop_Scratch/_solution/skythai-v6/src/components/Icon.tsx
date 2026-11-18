// ไอคอนเส้นเรียบง่ายวาดเอง (ไม่ใช้ชุดไอคอนของ Google)
const PATHS: Record<string, string> = {
  down: 'M6 9l6 6 6-6',
  up: 'M6 15l6-6 6 6',
  swap: 'M7 7h11l-3-3M17 17H6l3 3',
  person: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-4 4-6 8-6s8 2 8 6',
  info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 100 18 9 9 0 000-18z',
  filter: 'M4 6h16M7 12h10M10 18h4',
  leaf: 'M5 19c0-8 6-14 14-14 0 8-6 14-14 14zM5 19l7-7',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  chart: 'M4 20V4M4 20h16M7 15l4-4 3 3 5-6',
  bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20h4',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  plane: 'M2 13l8-1 5-8h2l-2 8 5 1 2-2h1l-1 3 1 3h-1l-2-2-5 1 2 8h-2l-5-8-8-1z',
  share: 'M16 6l-4-4-4 4M12 2v13M5 12v8h14v-8',
  minus: 'M6 12h12',
  plus: 'M12 6v12M6 12h12',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  theme: 'M12 3a9 9 0 000 18z M12 3a9 9 0 010 18',
  back: 'M19 12H5M11 6l-6 6 6 6',
  check: 'M5 12l5 5 9-10',
};
export default function Icon({ name, className = 'icon' }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d={PATHS[name] || ''} />
    </svg>
  );
}

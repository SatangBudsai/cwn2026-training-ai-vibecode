'use client';
import { useEffect, useRef, useState } from 'react';

export interface CounterProps {
  /** ค่าจริงเท่านั้น · SSR แสดงค่านี้เสมอ */
  value: number;
  durationMs?: number;
  testId?: string;
  className?: string;
}

/** นับขึ้นเมื่อเข้าจอ · ไม่มี JS หรือ reduced-motion เห็นค่าจริงทันที */
export function Counter({ value, durationMs = 1400, testId, className }: CounterProps) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / durationMs);
          setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} data-testid={testId} data-value={value} className={className}>
      {shown}
    </span>
  );
}

'use client';
import { useLayoutEffect, useRef, type ElementType, type ReactNode } from 'react';

const useIsoLayoutEffect = typeof window === 'undefined' ? () => {} : useLayoutEffect;

export interface RevealProps {
  children: ReactNode;
  /** หน่วงเป็นมิลลิวินาที สำหรับไล่ทีละชิ้น */
  delay?: number;
  as?: ElementType;
  className?: string;
}

/**
 * SSR แสดงเนื้อหาจริงเสมอ · ซ่อนเฉพาะเมื่อ JS ทำงานและอยู่นอกจอ
 * ไม่มี JS หรือ reduced-motion จึงเห็นเนื้อหาครบ
 */
export function Reveal({ children, delay = 0, as: Tag = 'div', className }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) return;
    el.classList.add('reveal-pending');
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          el.style.transitionDelay = delay ? `${delay}ms` : '';
          el.classList.add('reveal-in');
          el.classList.remove('reveal-pending');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

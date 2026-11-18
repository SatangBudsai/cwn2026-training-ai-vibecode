'use client';
import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Parallax } from '@/components/ui';
import { format } from '@/i18n/locales';
import styles from './home.module.css';

const ROTATE_MS = 7000;

export interface HeroSlide {
  src: string;
  alt: string;
  /** จุดโฟกัสของรูปเมื่อจอแคบกว่ารูป */
  position: string;
}

export interface HeroSliderProps {
  slides: HeroSlide[];
  labels: { slide: string; pause: string; play: string };
  /** ข้อความของ hero เรนเดอร์ฝั่งเซิร์ฟเวอร์ */
  children: ReactNode;
}

/**
 * ภาพแรกมากับ HTML (ภาพ LCP) · ภาพที่เหลือเริ่มโหลดหลัง window load + idle เท่านั้น (NFR-02)
 * reduced-motion: ไม่สลับภาพ ไม่ซูม และไม่โหลดภาพอื่นจนกว่าผู้ใช้จะกดเลือกเอง
 */
export function HeroSlider({ slides, labels, children }: HeroSliderProps) {
  const [showRest, setShowRest] = useState(false);
  const [loaded, setLoaded] = useState<boolean[]>(() => slides.map((_, i) => i === 0));
  const [{ active, prev }, setPos] = useState({ active: 0, prev: -1 });
  const [paused, setPaused] = useState(false);
  const wanted = useRef<number | null>(null);

  const moveTo = (index: number) => setPos((p) => (p.active === index ? p : { active: index, prev: p.active }));

  // โหลดภาพที่เหลือหลังหน้าเสร็จ
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPaused(true);
      return;
    }
    let idleId: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(() => setShowRest(true), { timeout: 2500 });
      } else {
        timer = setTimeout(() => setShowRest(true), 1200);
      }
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    const count = loaded.length;
    let next = -1;
    for (let step = 1; step < count; step += 1) {
      const candidate = (active + step) % count;
      if (loaded[candidate]) {
        next = candidate;
        break;
      }
    }
    if (next < 0) return;
    const timer = setInterval(() => {
      if (!document.hidden) setPos((p) => (p.active === next ? p : { active: next, prev: p.active }));
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [active, loaded, paused]);

  const select = (index: number) => {
    if (loaded[index]) {
      moveTo(index);
      return;
    }
    wanted.current = index;
    setShowRest(true);
  };

  const onSlideLoad = (index: number) => {
    setLoaded((list) => list.map((v, i) => (i === index ? true : v)));
    if (wanted.current === index) {
      wanted.current = null;
      moveTo(index);
    }
  };

  return (
    <section className={`${styles.hero} ${paused ? styles.heroPaused : ''}`} data-testid="home-hero">
      <Parallax strength={48} className={styles.heroStage}>
        {slides.map((slide, i) => {
          if (i > 0 && !showRest) return null;
          // ภาพแรกตอนเปิดหน้าไม่มี fade (prev = -1) เพื่อไม่ให้ภาพ LCP ถูกหน่วง
          const state = i === active ? `${styles.slideActive} ${prev >= 0 ? styles.slideFade : ''}` : i === prev ? styles.slidePrev : '';
          return (
            <div key={slide.src} className={`${styles.slide} ${state}`} data-testid={`home-hero-slide-${i + 1}`} data-active={i === active} aria-hidden={i !== active}>
              {i === 0 ? (
                <Image src={slide.src} alt={slide.alt} fill sizes="(max-width: 640px) 140vw, 100vw" preload fetchPriority="high" style={{ objectFit: 'cover', objectPosition: slide.position }} />
              ) : (
                <Image src={slide.src} alt={slide.alt} fill sizes="(max-width: 640px) 140vw, 100vw" loading="eager" fetchPriority="low" onLoad={() => onSlideLoad(i)} style={{ objectFit: 'cover', objectPosition: slide.position }} />
              )}
            </div>
          );
        })}
      </Parallax>
      <div aria-hidden="true" className={styles.heroShade} />

      <div className={`container ${styles.heroInner}`}>
        {children}
        <div className={styles.heroControls}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.heroDot} ${i === active ? styles.heroDotActive : ''}`}
              data-testid={`home-hero-dot-${i + 1}`}
              aria-label={format(labels.slide, { n: i + 1 })}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => select(i)}
            />
          ))}
          <button
            type="button"
            className={styles.heroPause}
            data-testid="home-hero-pause"
            aria-label={paused ? labels.play : labels.pause}
            onClick={() => {
              if (paused) setShowRest(true);
              setPaused((v) => !v);
            }}
          >
            <span aria-hidden="true" className={paused ? styles.iconPlay : styles.iconPause} />
          </button>
        </div>
      </div>
    </section>
  );
}

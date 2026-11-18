'use client';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Button } from '@/components/ui';
import { f8 } from '@/i18n/f8';
import type { Locale } from '@/types';
import styles from './tour.module.css';

const PANO_SRC = '/brand/shop/pano-couple.jpg';
const PANO_WIDTH = 1914;
const PANO_HEIGHT = 822;
/** ภาพต่อกัน 3 ชุด ความสูงเดียวกันจึงกว้างกว่าจอเสมอ */
const TILES = [0, 1, 2] as const;
const STEP_BUTTON = 30;
const STEP_KEY = 15;

function normalize(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** ค่าที่แสดงเป็นจำนวนเต็ม 0–359 */
function toDisplay(deg: number): number {
  return Math.round(normalize(deg)) % 360;
}

export function TourViewer({ locale }: { locale: Locale }) {
  const m = f8[locale];
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [touched, setTouched] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  // มุมไม่จำกัดช่วง เพื่อให้หมุนข้าม 359° → 0° ได้โดยไม่ย้อนทางยาว
  const targetRef = useRef(0);
  const visualRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const dragRef = useRef<{ id: number; startX: number; startTarget: number; tileWidth: number } | null>(null);

  const paint = useCallback((deg: number) => {
    const track = trackRef.current;
    if (!track) return;
    // % ของ transform อิงความกว้างของแถบเอง: 1 ชุดภาพ = 100 / 3 %
    const offset = (normalize(deg) / 360) * (100 / TILES.length);
    track.style.transform = `translate3d(${-offset}%, 0, 0)`;
  }, []);

  const stopAnimation = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  useEffect(() => stopAnimation, [stopAnimation]);

  const animate = useCallback(() => {
    stopAnimation();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      visualRef.current = targetRef.current;
      paint(visualRef.current);
      return;
    }
    const step = () => {
      const diff = targetRef.current - visualRef.current;
      if (Math.abs(diff) < 0.05) {
        visualRef.current = targetRef.current;
        paint(visualRef.current);
        frameRef.current = null;
        return;
      }
      visualRef.current += diff * 0.16;
      paint(visualRef.current);
      frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  }, [paint, stopAnimation]);

  const rotateBy = useCallback(
    (delta: number) => {
      targetRef.current += delta;
      setAngle(toDisplay(targetRef.current));
      setTouched(true);
      animate();
    },
    [animate],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    stopAnimation();
    // ปล่อยจากกลางแอนิเมชัน: เริ่มลากจากภาพที่เห็นอยู่จริง
    targetRef.current = visualRef.current;
    setAngle(toDisplay(visualRef.current));
    dragRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startTarget: visualRef.current,
      tileWidth: track.offsetWidth / TILES.length,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // pointer หมดอายุไปแล้ว ลากต่อด้วย event บนพื้นที่นี้ได้
    }
    setDragging(true);
    setTouched(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId || drag.tileWidth <= 0) return;
    // ลากไปซ้าย = ภาพเลื่อนซ้าย = มองไปทางขวา มุมเพิ่ม
    const next = drag.startTarget - ((e.clientX - drag.startX) / drag.tileWidth) * 360;
    targetRef.current = next;
    visualRef.current = next;
    paint(next);
    setAngle(toDisplay(next));
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.id !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      rotateBy(-STEP_KEY);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      rotateBy(STEP_KEY);
    }
  };

  return (
    <div className={styles.viewer}>
      <div
        className={dragging ? `${styles.viewport} ${styles.viewportDragging}` : styles.viewport}
        data-testid="tour-viewport"
        role="slider"
        tabIndex={0}
        aria-label={m.tourViewportLabel}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={angle}
        aria-valuetext={`${angle}°`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={onKeyDown}
        onDragStart={(e) => e.preventDefault()}
      >
        <div ref={trackRef} className={styles.track}>
          {TILES.map((tile) => (
            <div key={tile} className={styles.tile}>
              <Image
                src={PANO_SRC}
                alt={tile === 0 ? m.tourAlt : ''}
                aria-hidden={tile === 0 ? undefined : true}
                width={PANO_WIDTH}
                height={PANO_HEIGHT}
                sizes="(max-width: 700px) 720px, (max-width: 1400px) 110vw, 1500px"
                quality={85}
                preload={tile === 0}
                loading="eager"
                draggable={false}
                className={styles.tileImage}
              />
            </div>
          ))}
        </div>
        <div aria-hidden="true" className={styles.vignette} />
        {!touched && (
          <div aria-hidden="true" className={styles.dragHint}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 7 3 12l5 5M16 7l5 5-5 5M3 12h18" />
            </svg>
            {m.tourDragHint}
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <Button testId="tour-rotate-left" variant="ghost-light" aria-label={m.tourRotateLeft} title={m.tourRotateLeft} className={styles.rotate} onClick={() => rotateBy(-STEP_BUTTON)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Button>
        <div className={styles.dial}>
          <svg aria-hidden="true" viewBox="0 0 48 48" width="44" height="44" className={styles.compass}>
            <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '24px 24px' }}>
              <path d="M24 7l4 15h-8Z" fill="currentColor" />
            </g>
          </svg>
          <p className={styles.angleText}>
            <span className={styles.angleLabel}>{m.tourAngleLabel}</span>
            <strong data-testid="tour-angle" data-angle={angle}>
              {angle}°
            </strong>
          </p>
        </div>
        <Button testId="tour-rotate-right" variant="ghost-light" aria-label={m.tourRotateRight} title={m.tourRotateRight} className={styles.rotate} onClick={() => rotateBy(STEP_BUTTON)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>

      <p className={`container ${styles.hint}`} data-testid="tour-hint">
        {m.tourHint}
      </p>
    </div>
  );
}

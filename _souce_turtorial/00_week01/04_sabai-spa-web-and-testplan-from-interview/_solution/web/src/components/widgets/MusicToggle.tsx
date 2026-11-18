'use client';
import { useRef, useState } from 'react';
import { f8 } from '@/i18n/f8';
import type { Locale } from '@/types';
import styles from './music.module.css';

export interface MusicToggleProps {
  locale: Locale;
}

const AUDIO_SRC = '/audio/spa-ambient-placeholder.wav';

/** ปุ่มเพลงใน header · เปิดด้วยปุ่มเท่านั้น โหลดหน้าแล้ว audio.paused เป็น true เสมอ (NFR-10) */
export function MusicToggle({ locale }: MusicToggleProps) {
  const m = f8[locale];
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    audio.volume = 0.6;
    // เล่นไม่สำเร็จ เช่น เบราว์เซอร์ปฏิเสธ หรือไฟล์โหลดไม่ได้ ให้ปุ่มกลับตามสถานะจริง
    audio.play().catch(() => setPlaying(!audio.paused));
  };

  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={playing ? `${styles.button} ${styles.buttonOn}` : styles.button}
        data-testid="music-toggle"
        aria-label={m.musicLabel}
        aria-pressed={playing}
        title={m.musicLabel}
        onClick={toggle}
      >
        {playing ? (
          <span aria-hidden="true" className={styles.bars}>
            <i />
            <i />
            <i />
          </span>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V6l10-2v12" />
            <circle cx="6.5" cy="18" r="2.5" />
            <circle cx="16.5" cy="16" r="2.5" />
          </svg>
        )}
      </button>
      <span className={playing ? `${styles.note} ${styles.noteFlash}` : styles.note} data-testid="music-note">
        {m.musicNote}
      </span>
      <audio
        ref={audioRef}
        data-testid="music-audio"
        src={AUDIO_SRC}
        preload="none"
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </span>
  );
}

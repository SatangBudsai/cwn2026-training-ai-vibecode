'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// กล่องโต้ตอบ (role=dialog) แสดงนอก landmark ของฟอร์ม · Esc / คลิกนอกกล่อง = ปิด
export default function Modal({ label, onClose, children, className = '', modal = true }: {
  label?: string; onClose: () => void; children: ReactNode; className?: string; modal?: boolean;
}) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setEl(document.body), []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);
  useEffect(() => {
    const t = box.current?.querySelector<HTMLElement>('[data-autofocus]');
    t?.focus();
  }, [el]);
  if (!el) return null;
  return createPortal(
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} role="dialog" aria-modal={modal || undefined} aria-label={label} className={`dialog ${className}`}>
        {children}
      </div>
    </div>,
    el,
  );
}

export function CloseButton({ onClose, label = 'ปิดกล่องโต้ตอบ' }: { onClose: () => void; label?: string }) {
  return (
    <button type="button" className="icon-btn dialog-close" aria-label={label} onClick={onClose}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="icon"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  );
}

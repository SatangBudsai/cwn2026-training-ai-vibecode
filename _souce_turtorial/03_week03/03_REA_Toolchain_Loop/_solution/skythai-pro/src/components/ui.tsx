"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Close a popover when clicking outside of `ref` or pressing Escape. */
export function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

/** Modal dialog: the backdrop blocks every other click until it is closed (C21). */
export function Modal({ title, onClose, children, testId }: { title: string; onClose: () => void; children: ReactNode; testId?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" data-testid="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} data-testid={testId}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <h3>{title}</h3>
          <button className="icon-btn" aria-label="ปิดกล่องโต้ตอบ" data-testid="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Switch({ on, onToggle, label, testId }: { on: boolean; onToggle: () => void; label: string; testId?: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? "on" : ""}`} onClick={onToggle} data-testid={testId} />;
}

const BADGE_COLORS = ["#0b2a5b", "#e2453c", "#2b7a78", "#7b4fa0", "#c46b12", "#1f6fb2", "#a3324f", "#4a6b1f"];
export function AirlineBadge({ codes }: { codes: string[] }) {
  const c = codes[0] ?? "?";
  const color = BADGE_COLORS[(c.charCodeAt(0) + (c.charCodeAt(1) || 0)) % BADGE_COLORS.length];
  return (
    // the code is drawn with CSS (::before) so the row text starts with the departure time
    <div className="airline-badge" style={{ background: color }} aria-hidden="true" data-code={c === "multi" ? "✈+" : codes.length > 1 ? `${c}+` : c} />
  );
}

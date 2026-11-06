import type { ButtonHTMLAttributes } from "react";

/** The signature: every restaurant carries a race-card number */
export function NumberTag({ n, tone = "default" }: { n: number; tone?: "default" | "win" }) {
  return (
    <span
      className={`inline-grid h-7 min-w-11 shrink-0 place-items-center rounded-md border px-1.5 font-mono text-xs tnum ${
        tone === "win" ? "border-ember/60 bg-ember-soft text-ember-ink" : "border-line-strong bg-raised text-fg-2"
      }`}
      aria-label={`เบอร์ ${n}`}
    >
      {String(n).padStart(2, "0")}
    </span>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" };

export function Button({ variant = "secondary", className = "", ...props }: BtnProps) {
  const base =
    "inline-flex h-9 shrink-0 items-center whitespace-nowrap justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-[background-color,color,transform] duration-150 ease-[var(--ease-out-soft)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
  const styles = {
    primary: "bg-ember text-[#1a1006] hover:bg-[#f39a58]",
    secondary: "border border-line-strong bg-raised text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-[#2a2a2d]",
    ghost: "text-fg-2 hover:bg-raised hover:text-fg",
  }[variant];
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

export function formatMetres(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} กม.` : `${m} ม.`;
}

/** Roughly 80 m per minute for an office lunch walk */
export function walkMinutes(m: number) {
  return Math.max(1, Math.round(m / 80));
}

/** The team's nickname wins over the OSM name */
export function displayName(r: { name: string; nickname?: string | null }) {
  return r.nickname || r.name;
}

export function priceLabel(level: number | null | undefined) {
  return level ? "฿".repeat(level) : "";
}

export function formatPercent(p: number) {
  if (p === 0) return "0%";
  if (p < 0.001) return "<0.1%";
  return `${(p * 100).toFixed(1)}%`;
}

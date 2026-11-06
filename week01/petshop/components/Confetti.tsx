"use client";

import { useEffect, useState } from "react";

const COLORS = ["#FF6B4A", "#14B8A6", "#FFC145", "#8B5CF6", "#3B82F6", "#F472B6"];

// Deterministic layout (no Math.random) so screenshots are stable.
const PIECES = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 6) * 40,
  drift: ((i * 53) % 120) - 60,
  rot: (i * 47) % 360,
  color: COLORS[i % COLORS.length],
  shape: i % 3,
}));

/** One-shot confetti burst. Decorative only: pointer-events none, removed after it finishes. */
export function Confetti() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1600);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="confetti" aria-hidden="true" data-testid="confetti">
      {PIECES.map((p, i) => (
        <i
          key={i}
          className={`cf cf-${p.shape}`}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            ["--drift" as string]: `${p.drift}px`,
            ["--rot" as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}

/** Decorative client-side effects. All are pointer-events:none and skip under reduced motion. */

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Fly a small dot from `from` to the header cart icon (≤ 400 ms). */
export function flyToCart(from: Element | null) {
  if (!from || prefersReducedMotion()) return;
  const target = document.querySelector('[data-testid="cart-link"]');
  if (!target) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const dot = document.createElement("div");
  dot.className = "fly-dot";
  dot.setAttribute("aria-hidden", "true");
  const startX = a.left + a.width / 2 - 9;
  const startY = a.top + a.height / 2 - 9;
  const dx = b.left + b.width / 2 - 9 - startX;
  const dy = b.top + b.height / 2 - 9 - startY;
  dot.style.left = `${startX}px`;
  dot.style.top = `${startY}px`;
  document.body.appendChild(dot);
  const anim = dot.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(1.25)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.45)`, opacity: 0.2 },
    ],
    { duration: 400, easing: "cubic-bezier(.5,0,.3,1)" },
  );
  const cleanup = () => dot.remove();
  anim.onfinish = cleanup;
  anim.oncancel = cleanup;
  setTimeout(cleanup, 700);
}

"use client";

import { useShop } from "./ShopProvider";

/** A single toast at a time, never intercepts clicks (pointer-events: none). */
export function Toaster() {
  const { toast } = useShop();
  return (
    <div className="toast-zone" aria-live="polite">
      {toast ? (
        <div key={toast.id} className={`toast toast-${toast.kind}`} data-testid="toast" role="status">
          <span className="toast-icon" aria-hidden="true">
            {toast.kind === "error" ? "⚠️" : toast.kind === "info" ? "🐾" : "✅"}
          </span>
          {toast.text}
        </div>
      ) : null}
    </div>
  );
}

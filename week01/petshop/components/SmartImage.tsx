"use client";

import { useCallback, useState } from "react";

type Tone = "cat" | "dog" | "brand" | "teal" | "sun";

/**
 * <img> with a shimmer skeleton while loading and a gradient + emoji tile
 * when the file is missing (onError). Works even if the image failed before hydration.
 */
type SmartImageProps = {
  src: string;
  alt: string;
  emoji?: string;
  tone?: Tone;
  className?: string;
  testId?: string;
  eager?: boolean;
  /** Optional caption rendered on the fallback tile. */
  label?: string;
};

export function SmartImage(props: SmartImageProps) {
  // Re-mount when the source changes so the loading state starts fresh.
  return <SmartImageInner key={props.src} {...props} />;
}

function SmartImageInner({
  src,
  alt,
  emoji = "🐾",
  tone = "brand",
  className = "",
  testId,
  eager = false,
  label,
}: SmartImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  const imgRef = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete) setStatus(el.naturalWidth > 0 ? "loaded" : "error");
  }, []);

  return (
    <div
      className={`smart-img tone-${tone} is-${status} ${className}`}
      data-testid={testId}
      data-src={src}
      data-status={status}
    >
      {status !== "error" ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      ) : (
        <div className="img-fallback" role="img" aria-label={alt}>
          <span className="fb-paw fb-paw-1" aria-hidden="true">🐾</span>
          <span className="fb-paw fb-paw-2" aria-hidden="true">🐾</span>
          <span className="fb-emoji" aria-hidden="true">{emoji}</span>
          {label ? <span className="fb-label">{label}</span> : null}
        </div>
      )}
      {status === "loading" ? <div className="shimmer" aria-hidden="true" /> : null}
    </div>
  );
}

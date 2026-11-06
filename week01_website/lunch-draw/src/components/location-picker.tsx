"use client";

import { useEffect, useRef } from "react";
import type { Map as MlMap, Marker } from "maplibre-gl";
import { OFFICE } from "@/lib/geo";

const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

type LatLon = { lat: number; lon: number };

function dot(color: string, ring: string, size = 14) {
  const el = document.createElement("div");
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:999px;background:${color};box-shadow:0 0 0 3px ${ring};cursor:grab`;
  return el;
}

/** Click the map (or drag the pin) to choose where the restaurant is */
export function LocationPicker({ value, onChange }: { value: LatLon | null; onChange: (v: LatLon) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const pin = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !box.current || map.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const m = new ml.Map({
        container: box.current,
        style: STYLE,
        center: [OFFICE.lon, OFFICE.lat],
        zoom: 15.5,
        attributionControl: { compact: true },
      });
      map.current = m;
      new ml.Marker({ element: dot("#ededed", "rgba(20,20,21,0.9)", 12) }).setLngLat([OFFICE.lon, OFFICE.lat]).addTo(m);
      pin.current = new ml.Marker({ element: dot("#f0883e", "rgba(240,136,62,0.3)", 18), draggable: true });
      pin.current.on("dragend", () => {
        const p = pin.current!.getLngLat();
        onChangeRef.current({ lat: Number(p.lat.toFixed(6)), lon: Number(p.lng.toFixed(6)) });
      });
      m.on("click", (e) => onChangeRef.current({ lat: Number(e.lngLat.lat.toFixed(6)), lon: Number(e.lngLat.lng.toFixed(6)) }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // keep the pin in sync with the value (it can also come from a pasted link)
  useEffect(() => {
    const m = map.current;
    const p = pin.current;
    if (!m || !p) return;
    if (!value) {
      p.remove();
      return;
    }
    p.setLngLat([value.lon, value.lat]).addTo(m);
    if (!m.getBounds().contains([value.lon, value.lat])) m.easeTo({ center: [value.lon, value.lat], duration: 400 });
  }, [value]);

  useEffect(() => () => map.current?.remove(), []);

  return (
    <div
      ref={box}
      data-testid="location-map"
      className="h-72 w-full overflow-hidden rounded-xl border border-line bg-deep"
      aria-label="แผนที่ กดเพื่อปักหมุดร้าน"
    />
  );
}

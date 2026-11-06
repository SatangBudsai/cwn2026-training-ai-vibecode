"use client";

import { useEffect, useRef } from "react";
import type { Map as MlMap, GeoJSONSource } from "maplibre-gl";
import { OFFICE } from "@/lib/geo";

const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

type LngLat = [number, number];

async function walkingRoute(to: { lat: number; lon: number }): Promise<LngLat[]> {
  const straight: LngLat[] = [
    [OFFICE.lon, OFFICE.lat],
    [to.lon, to.lat],
  ];
  try {
    const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${OFFICE.lon},${OFFICE.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const json = await res.json();
    return json.routes?.[0]?.geometry?.coordinates ?? straight;
  } catch {
    return straight;
  }
}

function dot(color: string, ring: string) {
  const el = document.createElement("div");
  el.style.cssText = `width:14px;height:14px;border-radius:999px;background:${color};box-shadow:0 0 0 3px ${ring}`;
  return el;
}

export function WalkMap({ lat, lon }: { lat: number; lon: number }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !box.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

      if (!map.current) {
        map.current = new ml.Map({
          container: box.current,
          style: STYLE,
          center: [OFFICE.lon, OFFICE.lat],
          zoom: 15.5,
          attributionControl: { compact: true },
        });
        new ml.Marker({ element: dot("#ededed", "rgba(20,20,21,0.9)") }).setLngLat([OFFICE.lon, OFFICE.lat]).addTo(map.current);
      }
      const m: MlMap = map.current;
      if (!m.loaded()) await new Promise((r) => m.once("load", r));
      if (cancelled) return;

      const coords = await walkingRoute({ lat, lon });
      if (cancelled) return;

      const data = { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: coords } };
      const src = m.getSource("route") as GeoJSONSource | undefined;
      if (src) src.setData(data);
      else {
        m.addSource("route", { type: "geojson", data });
        m.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#f0883e", "line-width": 3, "line-dasharray": [1, 1.6] },
        });
      }

      document.querySelectorAll(".winner-marker").forEach((n) => n.remove());
      const el = dot("#f0883e", "rgba(240,136,62,0.25)");
      el.className = "winner-marker";
      new ml.Marker({ element: el }).setLngLat([lon, lat]).addTo(m);

      const b = new ml.LngLatBounds(coords[0], coords[0]);
      coords.forEach((c) => b.extend(c));
      m.fitBounds(b, { padding: 48, maxZoom: 17, duration: 600 });
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  useEffect(() => () => map.current?.remove(), []);

  return <div ref={box} className="h-56 w-full overflow-hidden rounded-xl border border-line bg-deep sm:h-64" />;
}

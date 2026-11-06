"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MlMap, Marker } from "maplibre-gl";
import { MapPin, Navigation, X } from "lucide-react";
import { LAZY_RADIUS_M, OFFICE, googleDirectionsUrl, googleMapsUrl } from "@/lib/geo";
import { walkMetres, type Odd } from "@/lib/odds";
import type { RestaurantDTO } from "@/lib/server";
import type { Category } from "./category-votes";
import { Button, NumberTag, displayName, formatMetres, formatPercent, priceLabel } from "./ui";
import { VoteControl, votersTitle } from "./vote-control";
import { RatingPicker, RatingSummary } from "./rating";

// Same free vector style as the other maps. Pins are DOM markers, so they still show
// (on a blank background) when the tile server cannot be reached.
const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const TOP_ACCENT = 5;

function circle(radiusM: number, steps = 64): [number, number][] {
  const out: [number, number][] = [];
  const dLat = radiusM / 111_320;
  const dLon = radiusM / (111_320 * Math.cos((OFFICE.lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    out.push([OFFICE.lon + dLon * Math.cos(a), OFFICE.lat + dLat * Math.sin(a)]);
  }
  return out;
}

type Pin = { m: Marker; el: HTMLButtonElement; dot: HTMLSpanElement; tip: HTMLSpanElement };

/** A pin is a button MapLibre positions; only its children are styled so the positioning is never overwritten */
function makePin(): Omit<Pin, "m"> {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "map-pin";
  const dot = document.createElement("span");
  dot.className = "map-pin-dot";
  const tip = document.createElement("span");
  tip.className = "map-pin-tip";
  el.append(dot, tip);
  return { el, dot, tip };
}

type Props = {
  odds: Odd[];
  byId: Map<number, RestaurantDTO>;
  categories: Category[];
  lazy: boolean;
  highlightId: number | null;
  winnerId: number | null;
  picks: Record<number, number>;
  myPicks: Record<number, number>;
  pickVoters?: Record<number, { up: string[]; down: string[] }>;
  onPick: (id: number, value: -1 | 0 | 1) => void;
  rater: string | null;
  onRate: (id: number, score: number) => void;
  /** restaurants matching the search box, or null when not searching */
  matchIds: Set<number> | null;
  /** unsaved restaurant votes */
  pending: Record<number, number>;
};

/** Every restaurant in the current pool on one map; pin size follows the odds */
export function OddsMap({
  odds,
  byId,
  categories,
  lazy,
  highlightId,
  winnerId,
  picks,
  myPicks,
  pickVoters,
  onPick,
  rater,
  onRate,
  matchIds,
  pending,
}: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const pins = useRef(new Map<number, Pin>());
  const ml = useRef<typeof import("maplibre-gl") | null>(null);
  const [mapReady, setMapReady] = useState(false); // map object exists: pins can be placed
  const [styleReady, setStyleReady] = useState(false); // base map loaded: layers can be added
  const [selected, setSelected] = useState<number | null>(null);
  // restaurants sharing the clicked spot (same building, pins on top of each other)
  const [here, setHere] = useState<number[]>([]);
  const oddsRef = useRef(odds);
  useEffect(() => {
    oddsRef.current = odds;
  }, [odds]);
  const labels = new Map(categories.map((c) => [c.id, c.label]));
  const byIdRef = useRef(byId);
  useEffect(() => {
    byIdRef.current = byId;
  }, [byId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lib = await import("maplibre-gl");
      if (cancelled || !box.current) return;
      lib.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      ml.current = lib;
      const m = new lib.Map({
        container: box.current,
        style: STYLE,
        center: [OFFICE.lon, OFFICE.lat],
        zoom: 14.6, // the whole 1 km circle
        attributionControl: { compact: true },
      });
      map.current = m;
      m.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
      const office = document.createElement("div");
      office.className = "map-office";
      office.title = OFFICE.name;
      new lib.Marker({ element: office }).setLngLat([OFFICE.lon, OFFICE.lat]).addTo(m);
      m.on("click", () => {
        setSelected(null);
        setHere([]);
      });
      m.on("load", () => {
        m.addSource("lazy", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [circle(LAZY_RADIUS_M)] } } });
        m.addLayer({ id: "lazy-fill", type: "fill", source: "lazy", paint: { "fill-color": "#f0883e", "fill-opacity": 0.05 } });
        m.addLayer({ id: "lazy-line", type: "line", source: "lazy", paint: { "line-color": "#f0883e", "line-opacity": 0.5, "line-width": 1, "line-dasharray": [2, 2] } });
        if (!cancelled) setStyleReady(true);
      });
      setMapReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      pins.current.forEach(({ m }) => m.remove());
      pins.current.clear();
      map.current?.remove();
    },
    [],
  );

  // the 500 m ring only means something in lazy mode
  useEffect(() => {
    const m = map.current;
    if (!m || !styleReady) return;
    for (const id of ["lazy-fill", "lazy-line"]) m.setLayoutProperty(id, "visibility", lazy ? "visible" : "none");
  }, [lazy, styleReady]);

  // add, update and remove pins as the pool and the odds change
  useEffect(() => {
    const m = map.current;
    const lib = ml.current;
    if (!m || !lib || !mapReady) return;
    // size between the least and the most likely place (equal odds -> small pins)
    const maxP = odds[0]?.p ?? 0;
    const minP = odds[odds.length - 1]?.p ?? 0;
    const spread = maxP - minP;
    const rank = new Map(odds.map((o, i) => [o.id, i]));
    const keep = new Set<number>();
    for (const o of odds) {
      const r = byId.get(o.id);
      if (!r || (matchIds && !matchIds.has(o.id))) continue;
      keep.add(o.id);
      let pin = pins.current.get(o.id);
      if (!pin) {
        const parts = makePin();
        parts.el.dataset.testid = "map-pin";
        parts.el.dataset.number = String(o.id);
        parts.el.addEventListener("click", (e) => {
          e.stopPropagation(); // the map's own click clears the selection
          setSelected(o.id);
          // every pin within a few pixels of this one: they cannot be clicked separately
          const at = m.project([r.lon, r.lat]);
          const near = oddsRef.current
            .map((x) => ({ x, r: byIdRef.current.get(x.id) }))
            .filter(({ r: other }) => other && m.project([other.lon, other.lat]).dist(at) < 12)
            .map(({ x }) => x.id);
          setHere(near.length > 1 ? near : []);
        });
        pin = { ...parts, m: new lib.Marker({ element: parts.el }).setLngLat([r.lon, r.lat]).addTo(m) };
        pins.current.set(o.id, pin);
      }
      const lit = highlightId === o.id || winnerId === o.id;
      const top = spread > 1e-9 && (rank.get(o.id) ?? 99) < TOP_ACCENT; // accent only when odds differ
      const size = Math.round(9 + 11 * (spread > 1e-9 ? (o.p - minP) / spread : 0));
      pin.dot.style.width = pin.dot.style.height = `${lit ? Math.max(size, 18) : size}px`;
      pin.el.dataset.tone = lit ? "lit" : top ? "top" : "normal";
      pin.el.dataset.selected = String(selected === o.id);
      pin.tip.textContent = `${displayName(r)} · ${formatPercent(o.p)}`;
      pin.el.setAttribute("aria-label", `${displayName(r)} โอกาส ${formatPercent(o.p)}`);
      // likely places and the selection sit on top of the rest
      pin.el.style.zIndex = String(selected === o.id || lit ? 1000 : 500 - (rank.get(o.id) ?? 0));
    }
    for (const [id, p] of pins.current) {
      if (!keep.has(id)) {
        p.m.remove();
        pins.current.delete(id);
      }
    }
  }, [odds, byId, highlightId, winnerId, selected, mapReady, matchIds]);

  // searching: zoom to what was found, only when the results change (not on every live update)
  const matchKey = matchIds ? [...matchIds].sort((x, y) => x - y).join(",") : "";
  useEffect(() => {
    const m = map.current;
    const lib = ml.current;
    if (!m || !lib || !matchIds || !matchIds.size) return;
    const found = [...matchIds].map((id) => byIdRef.current.get(id)).filter((r): r is RestaurantDTO => !!r && !r.disabled);
    if (!found.length) return;
    const b = new lib.LngLatBounds([found[0].lon, found[0].lat], [found[0].lon, found[0].lat]);
    found.forEach((r) => b.extend([r.lon, r.lat]));
    m.fitBounds(b, { padding: 60, maxZoom: 17, duration: 400 });
  }, [matchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // follow the draw: fly to the winner and open it
  useEffect(() => {
    const r = winnerId != null ? byId.get(winnerId) : null;
    if (!r || !map.current) return;
    map.current.easeTo({ center: [r.lon, r.lat], zoom: Math.max(map.current.getZoom(), 15.5), duration: 500 });
  }, [winnerId, byId]);

  const sel = selected != null ? byId.get(selected) : null;
  // side panel list: the top places, or what the search found
  const listed = matchIds ? odds.filter((o) => matchIds.has(o.id)).slice(0, 12) : odds.slice(0, TOP_ACCENT);
  const selOdd = selected != null ? odds.find((o) => o.id === selected) : null;

  function focus(id: number) {
    const r = byId.get(id);
    setSelected(id);
    if (r) map.current?.easeTo({ center: [r.lon, r.lat], zoom: Math.max(map.current.getZoom(), 15.5), duration: 400 });
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <div
          ref={box}
          data-testid="odds-map"
          data-count={odds.length}
          className="h-[420px] w-full overflow-hidden rounded-xl border border-line bg-deep lg:h-[560px]"
        />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-[3px] bg-fg" /> จันวาณิชย์
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-full bg-ember" /> {TOP_ACCENT} ร้านที่มีโอกาสสูงสุด
          </span>
          <span>หมุดยิ่งใหญ่ยิ่งมีโอกาส · {odds.length} ร้าน</span>
          {lazy && <span>เส้นประคือระยะเดิน 500 ม.</span>}
        </div>
      </div>

      <aside className="self-start rounded-xl border border-line bg-deep p-4 lg:min-h-[560px]" data-testid="map-panel">
        {sel && selOdd ? (
          <div data-testid="map-selected" data-number={sel.number}>
            <div className="flex items-start justify-between gap-2">
              <NumberTag n={sel.number} />
              <button
                type="button"
                aria-label="ปิด"
                onClick={() => {
                  setSelected(null);
                  setHere([]);
                }}
                className="grid size-8 place-items-center rounded-md text-fg-3 hover:bg-raised hover:text-fg"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <h3 className="mt-3 text-lg leading-tight font-medium">{displayName(sel)}</h3>
            {sel.nickname && <div className="mt-0.5 text-sm text-fg-2">{sel.name}</div>}
            <div className="mt-2 text-sm text-fg-2">
              {sel.categories.map((c) => labels.get(c) ?? c).join(" · ")}
              {sel.priceLevel != null && <span className="font-mono"> · {priceLabel(sel.priceLevel)}</span>}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
              <div className="bg-card px-3 py-2">
                <dt className="text-xs text-fg-3">โอกาส</dt>
                <dd className="font-mono text-base tnum" data-testid="map-selected-p">{formatPercent(selOdd.p)}</dd>
              </div>
              <div className="bg-card px-3 py-2">
                <dt className="text-xs text-fg-3">ระยะเดิน</dt>
                <dd className="font-mono text-base tnum">{formatMetres(walkMetres(sel))}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-col items-start gap-2">
              <span className="text-sm text-fg-2">อยากไปร้านนี้ไหม</span>
              <VoteControl
                mine={myPicks[sel.id] ?? 0}
                net={picks[sel.id] ?? 0}
                groupLabel={`โหวตร้าน ${displayName(sel)}`}
                showNet={pickVoters !== undefined}
                pending={pending[sel.id] !== undefined}
                title={votersTitle(pickVoters?.[sel.id])}
                onVote={(v) => onPick(sel.id, v)}
              />
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <RatingPicker
                mine={rater ? (sel.ratings[rater] ?? 0) : 0}
                avg={sel.ratingAvg}
                count={sel.ratingCount}
                onRate={(s) => onRate(sel.id, s)}
                compact
              />
            </div>

            {here.length > 1 && (
              <div className="mt-4 border-t border-line pt-3" data-testid="map-here">
                <div className="text-xs text-fg-3">ร้านที่อยู่จุดเดียวกัน {here.length} ร้าน</div>
                <ul className="mt-1">
                  {here.map((id) => {
                    const r = byId.get(id);
                    if (!r) return null;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          aria-current={id === sel.id}
                          onClick={() => setSelected(id)}
                          className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm transition-colors hover:bg-raised ${
                            id === sel.id ? "bg-raised text-fg" : "text-fg-2"
                          }`}
                        >
                          <span className="font-mono text-xs text-fg-3 tnum">{String(r.number).padStart(2, "0")}</span>
                          <span className="truncate">{displayName(r)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={googleDirectionsUrl(sel.lat, sel.lon)} target="_blank" rel="noreferrer" className="contents">
                <Button className="w-full">
                  <Navigation size={16} strokeWidth={1.5} />
                  เส้นทางเดิน
                </Button>
              </a>
              <a href={googleMapsUrl(sel.lat, sel.lon, sel.name)} target="_blank" rel="noreferrer" className="contents">
                <Button variant="ghost" className="w-full">
                  <MapPin size={16} strokeWidth={1.5} />
                  Google Maps
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-medium">{matchIds ? `ผลการค้นหา ${listed.length} ร้าน` : "โอกาสสูงสุด"}</h3>
            <p className="mt-1 text-xs text-fg-3">ชี้หมุดเพื่อดูชื่อร้าน กดหมุดเพื่อดูรายละเอียดและโหวต</p>
            <ol className="mt-3">
              {listed.map((o) => {
                const r = byId.get(o.id);
                if (!r) return null;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => focus(o.id)}
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-raised"
                    >
                      <NumberTag n={r.number} />
                      <span className="min-w-0 flex-1 truncate text-sm">{displayName(r)}</span>
                      <RatingSummary avg={r.ratingAvg} count={r.ratingCount} size={18} />
                      <span className="font-mono text-xs text-fg-2 tnum">{formatPercent(o.p)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </aside>
    </div>
  );
}

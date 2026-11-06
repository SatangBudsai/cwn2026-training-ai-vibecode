"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, MapPin } from "lucide-react";
import { LAZY_RADIUS_M, MAX_ADD_RADIUS_M, OFFICE, haversine, parseLatLon } from "@/lib/geo";
import { PRICE_LEVELS } from "@/lib/odds";
import { LocationPicker } from "./location-picker";
import { Button, NumberTag, formatMetres } from "./ui";

type LatLon = { lat: number; lon: number };
type Added = { number: number; name: string; walk: number; estimated: boolean };

const input =
  "h-10 w-full rounded-lg border border-line-strong bg-raised px-3 text-sm placeholder:text-fg-3 focus:border-ember/60 focus:outline-none";

export function AddRestaurantForm({ categories }: { categories: { id: string; label: string }[] }) {
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [hours, setHours] = useState("");
  const [loc, setLoc] = useState<LatLon | null>(null);
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Added | null>(null);

  const distance = useMemo(() => (loc ? Math.round(haversine(OFFICE, loc)) : null), [loc]);
  const tooFar = distance != null && distance > MAX_ADD_RADIUS_M;
  const missing = [!name.trim() && "ชื่อร้าน", !loc && "ตำแหน่ง", !cats.length && "แนวอาหาร"].filter(Boolean) as string[];

  function readPasted(text: string) {
    setPasted(text);
    if (!text.trim()) return setPasteError(false);
    const p = parseLatLon(text);
    setPasteError(!p);
    if (p) setLoc(p);
  }

  function reset() {
    setName("");
    setNickname("");
    setCats([]);
    setPrice(null);
    setHours("");
    setLoc(null);
    setPasted("");
    setPasteError(false);
    setError(null);
    setAdded(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (missing.length || tooFar || !loc) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        nickname: nickname || null,
        categories: cats,
        priceLevel: price,
        openingHours: hours || null,
        lat: loc.lat,
        lon: loc.lon,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) return setError(json.error ?? "เพิ่มร้านไม่สำเร็จ");
    setAdded({
      number: json.number,
      name: nickname.trim() || name.trim(),
      walk: json.walkDistance ?? Math.round(json.distance * 1.3),
      estimated: json.walkDistance == null,
    });
  }

  if (added) {
    return (
      <div className="rise mx-auto mt-8 max-w-md rounded-2xl border border-line bg-card p-6" data-testid="added">
        <div className="flex items-center gap-2 text-sm text-good">
          <Check size={16} strokeWidth={1.5} />
          เพิ่มร้านแล้ว
        </div>
        <div className="mt-4 flex items-center gap-3">
          <NumberTag n={added.number} tone="win" />
          <h1 className="text-xl font-medium">{added.name}</h1>
        </div>
        <p className="mt-2 text-sm text-fg-2">
          เดิน {formatMetres(added.walk)}
          {added.estimated && " (ประมาณ)"}
          {added.walk <= LAZY_RADIUS_M && " · อยู่ในโหมดขี้เกียจเดิน"}
        </p>
        <div className="mt-6 flex gap-2">
          <Link href="/" className="contents">
            <Button variant="primary" className="flex-1">
              ไปหน้าจับสลาก
            </Button>
          </Link>
          <Button onClick={reset}>เพิ่มอีกร้าน</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rise grid gap-6 pt-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8">
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5">
        <div>
          <h1 className="text-xl font-medium">เพิ่มร้าน</h1>
          <p className="mt-1 text-sm text-fg-2">ร้านที่ยังไม่มีบนกระดาน ปักหมุดบนแผนที่หรือวางลิงก์ Google Maps</p>
        </div>
        <LocationPicker value={loc} onChange={(v) => { setLoc(v); setPasted(""); setPasteError(false); }} />
        <label className="block">
          <span className="mb-2 block text-xs text-fg-3">หรือวางลิงก์ Google Maps / พิกัด</span>
          <input
            value={pasted}
            onChange={(e) => readPasted(e.target.value)}
            placeholder="13.7243, 100.5251"
            className={input}
          />
        </label>
        {pasteError && (
          <p className="-mt-2 text-xs text-bad">
            อ่านตำแหน่งจากข้อความนี้ไม่ได้ ลิงก์แบบย่อ (maps.app.goo.gl) ให้เปิดในเบราว์เซอร์ก่อนแล้วคัดลอกลิงก์เต็ม
          </p>
        )}
        <div className="flex items-center gap-2 text-sm" data-testid="location-status">
          <MapPin size={16} strokeWidth={1.5} className="text-fg-3" />
          {loc ? (
            <span className={tooFar ? "text-bad" : "text-fg-2"}>
              <span className="font-mono tnum">
                {loc.lat.toFixed(5)}, {loc.lon.toFixed(5)}
              </span>{" "}
              · ห่างออฟฟิศ {formatMetres(distance!)} (เส้นตรง)
              {tooFar && ` · ไกลเกิน ${MAX_ADD_RADIUS_M / 1000} กม.`}
            </span>
          ) : (
            <span className="text-fg-3">ยังไม่ได้ปักหมุด</span>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-5 self-start rounded-2xl border border-line bg-card p-5">
        <label className="block">
          <span className="mb-2 block text-xs text-fg-3">ชื่อร้าน</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={input} />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs text-fg-3">ชื่อเล่น (ไม่บังคับ)</span>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} className={input} />
        </label>

        <fieldset>
          <legend className="mb-2 text-xs text-fg-3">แนวอาหาร</legend>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const on = cats.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCats((cs) => (on ? cs.filter((x) => x !== c.id) : [...cs, c.id]))}
                  className={`h-8 rounded-lg border px-3 text-xs transition-colors ${
                    on ? "border-ember/50 bg-ember-soft text-ember-ink" : "border-line text-fg-2 hover:text-fg"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs text-fg-3">ราคาต่อคน (ไม่บังคับ)</legend>
          <div className="grid grid-cols-4 gap-1">
            {PRICE_LEVELS.map((p) => (
              <button
                key={p.level}
                type="button"
                aria-pressed={price === p.level}
                onClick={() => setPrice(price === p.level ? null : p.level)}
                className={`h-12 rounded-lg border text-xs transition-colors ${
                  price === p.level ? "border-ember/50 bg-ember-soft text-ember-ink" : "border-line text-fg-2 hover:text-fg"
                }`}
              >
                <span className="block font-mono">{p.label}</span>
                <span className="block text-[11px] text-fg-3">{p.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-2 block text-xs text-fg-3">เวลาเปิด (ไม่บังคับ)</span>
          <input value={hours} onChange={(e) => setHours(e.target.value)} maxLength={80} placeholder="จ–ศ 10:00–15:00" className={input} />
        </label>

        <div className="border-t border-line pt-4">
          <Button variant="primary" className="h-11 w-full" disabled={saving || missing.length > 0 || tooFar}>
            {saving ? "กำลังเพิ่ม" : "เพิ่มร้าน"}
          </Button>
          <p className="mt-2 text-xs text-fg-3" data-testid="form-hint">
            {missing.length ? `ยังขาด: ${missing.join(", ")}` : tooFar ? "ร้านอยู่ไกลเกินไป" : "พร้อมเพิ่มร้าน"}
          </p>
          {error && <p className="mt-2 text-sm text-bad">{error}</p>}
        </div>
      </section>
    </form>
  );
}

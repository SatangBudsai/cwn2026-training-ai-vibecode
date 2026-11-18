"use client";
import { useState } from "react";
import { parsePlaceIds, placesLabel, searchPlaces } from "@/lib/places";
import { useDismiss } from "./ui";

const ICON = { city: "🏙️", airport: "✈️", country: "🗾" } as const;

export function PlacePicker({ label, value, onChange, testId }: { label: string; value: string; onChange: (ids: string) => void; testId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [multi, setMulti] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const selected = parsePlaceIds(value);
  const results = searchPlaces(text);
  const ids = selected.map((p) => p.id);

  const pick = (id: string) => {
    if (multi) {
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      onChange(next.join(","));
    } else {
      onChange(id);
      setOpen(false);
    }
  };

  return (
    <div className="field" ref={ref}>
      <button type="button" className="field-btn" data-testid={testId} aria-label={`${label}, ${placesLabel(selected) || "ยังไม่ได้เลือก"}`}
        onClick={() => { setText(""); setOpen((o) => !o); }}>
        <span className="lbl">{label}</span>
        <span className={`val ${selected.length ? "" : "placeholder"}`}>{placesLabel(selected) || "ไปที่ไหน?"}</span>
      </button>
      {open && (
        <div className="popover" data-testid={`${testId}-popover`} style={{ width: 380 }}>
          <input autoFocus className="text-input" placeholder={`พิมพ์ชื่อเมืองหรือสนามบิน (${label})`} value={text}
            data-testid={`${testId}-input`} onChange={(e) => setText(e.target.value)} />
          <label style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8, fontSize: 13 }}>
            <input type="checkbox" checked={multi} data-testid={`${testId}-multi`} onChange={(e) => setMulti(e.target.checked)} />
            เลือกสนามบินหลายแห่ง
          </label>
          <ul className="place-list" role="listbox">
            {results.map((p) => (
              <li key={p.id} role="option" aria-selected={ids.includes(p.id)} className={ids.includes(p.id) ? "active" : ""}
                data-testid={`place-option-${p.id}`} onClick={() => pick(p.id)}>
                {multi && <input type="checkbox" readOnly checked={ids.includes(p.id)} />}
                <span className="place-ico">{ICON[p.kind]}</span>
                <span><div>{p.name}</div><div className="detail">{p.detail}</div></span>
              </li>
            ))}
            {results.length === 0 && <li className="detail">ไม่พบสถานที่ที่ตรงกับ “{text}”</li>}
          </ul>
          {multi && <div className="popover-actions"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>เสร็จ</button></div>}
        </div>
      )}
    </div>
  );
}

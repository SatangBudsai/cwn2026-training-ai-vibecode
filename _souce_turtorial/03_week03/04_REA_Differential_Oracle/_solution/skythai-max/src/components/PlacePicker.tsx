"use client";
import { useState } from "react";
import { parsePlaceIds, placesLabel, searchPlaces } from "@/lib/places";
import { useDismiss } from "./ui";

const ICON = { city: "🏙️", airport: "✈️", country: "🗾", station: "🚉" } as const;

export function PlacePicker({ label, value, onChange, testId }: { label: string; value: string; onChange: (ids: string) => void; testId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [multi, setMulti] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const selected = parsePlaceIds(value);
  // the box starts with the current choice; the list is only narrowed once the user types
  const results = dirty ? searchPlaces(text) : searchPlaces("");
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
        onClick={() => { setText(placesLabel(selected)); setDirty(false); setOpen((o) => !o); }}>
        <span className="lbl">{label}</span>
        {/* empty choice: the hint is drawn by CSS so the button text really is empty (C5) */}
        <span className={`val ${selected.length ? "" : "placeholder"}`} data-ph={label === "ต้นทาง" ? "จากที่ไหน?" : "ไปที่ไหน?"}>{placesLabel(selected)}</span>
      </button>
      {open && (
        <div className="popover" data-testid={`${testId}-popover`} style={{ width: 380 }}>
          <input autoFocus className="text-input" placeholder={`พิมพ์ชื่อเมืองหรือสนามบิน (${label})`} value={text}
            data-testid={`${testId}-input`} onFocus={(e) => e.target.select()}
            onChange={(e) => { setText(e.target.value); setDirty(true); }}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              // Escape after editing: an emptied box or text that matches no place clears the field (C5, C29)
              if (dirty && (!text.trim() || results.length === 0)) onChange("");
              // close here: the parent re-render can detach the document-level Escape listener mid-event
              setOpen(false);
            }} />
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

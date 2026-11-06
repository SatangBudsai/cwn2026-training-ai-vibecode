"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { formatBaht } from "@/lib/pricing";
import {
  LIFE_PET_LABEL,
  PET_EMOJI,
  TYPE_LABEL,
  lowestPrice,
  productImage,
  smallestSize,
  type FoodType,
  type LifeStage,
  type Pet,
  type Product,
} from "@/lib/products";
import { useAddToCart } from "./ProductCard";
import { SmartImage } from "./SmartImage";

type Result = Product & { score: number; reasons: string[] };

const LIFE_EMOJI: Record<LifeStage, string> = { baby: "🍼", adult: "💪", senior: "🧓" };

function ResultCard({ item, index }: { item: Result; index: number }) {
  const add = useAddToCart();
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <li className="finder-result" data-testid="finder-result" data-slug={item.slug} style={{ ["--i" as string]: index }}>
      {index === 0 ? <span className="best-badge">🏆 ตรงใจที่สุด</span> : null}
      <Link href={`/products/${item.slug}`} className="fr-media">
        <SmartImage src={productImage(item.slug)} alt={`รูปสินค้า ${item.name}`} emoji={PET_EMOJI[item.pet]} tone={item.pet} />
      </Link>
      <div className="fr-body">
        <div className="score-ring" style={{ ["--score" as string]: item.score }}>
          <span data-testid="match-score">ตรงใจ {item.score}%</span>
        </div>
        <Link href={`/products/${item.slug}`} className="fr-name">
          {item.name}
        </Link>
        <small className="muted">
          {item.nameEn} · {TYPE_LABEL[item.type]}
        </small>
        <ul className="reason-list">
          {item.reasons.map((r) => (
            <li key={r} className="reason-chip" data-testid="match-reason">
              {r}
            </li>
          ))}
        </ul>
        <div className="fr-foot">
          <strong>{formatBaht(lowestPrice(item))}</strong>
          <button
            ref={btn}
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => add(item, smallestSize(item).label, 1, btn.current)}
            data-testid="finder-add"
          >
            ใส่ตะกร้า
          </button>
        </div>
      </div>
    </li>
  );
}

export function FinderWizard() {
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [pet, setPet] = useState<Pet | null>(null);
  const [life, setLife] = useState<LifeStage | null>(null);
  const [noChicken, setNoChicken] = useState(false);
  const [grainFree, setGrainFree] = useState(false);
  const [type, setType] = useState<"any" | FoodType>("any");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = (n: number) => {
    setDir(n > step ? "fwd" : "back");
    setStep(n);
  };

  const submit = async () => {
    if (!pet) return;
    setLoading(true);
    setError(null);
    const sp = new URLSearchParams({ pet });
    if (life) sp.set("life", life);
    if (noChicken) sp.set("noChicken", "1");
    if (grainFree) sp.set("grainFree", "1");
    if (type !== "any") sp.set("type", type);
    try {
      const res = await fetch(`/api/recommendations?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setResults(Array.isArray(data.items) ? data.items : []);
      setDir("fwd");
      setStep(4);
    } catch {
      setError("โหลดผลลัพธ์ไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setPet(null);
    setLife(null);
    setNoChicken(false);
    setGrainFree(false);
    setType("any");
    setResults(null);
    go(1);
  };

  const progress = Math.round((Math.min(step, 3) / 3) * 100);
  const lifeLabels = LIFE_PET_LABEL[pet ?? "cat"];

  return (
    <div className="container page finder-page">
      <header className="finder-hero">
        <div>
          <p className="eyebrow light">🧭 Pet Food Finder</p>
          <h1>หาอาหารที่ใช่ ใน 3 ขั้นตอน</h1>
          <p>บอกเราเกี่ยวกับน้องสักหน่อย แล้วเราจะจับคู่สูตรที่เหมาะที่สุดให้</p>
        </div>
        <SmartImage src="/images/brand/finder.jpg" alt="ตัวช่วยเลือกอาหารสัตว์เลี้ยง" emoji="🧭" tone="teal" className="finder-hero-img" />
      </header>

      <div className="finder-card">
        <div className="finder-progress-wrap">
          <div
            className="finder-progress"
            data-testid="finder-progress"
            role="progressbar"
            aria-label="ความคืบหน้า"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            data-step={Math.min(step, 3)}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <ol className="finder-steps">
            {["สัตว์เลี้ยง", "ช่วงวัย", "ความต้องการพิเศษ"].map((s, i) => (
              <li key={s} className={step > i + 1 ? "done" : step === i + 1 ? "current" : ""}>
                <span>{step > i + 1 ? "✓" : i + 1}</span> {s}
              </li>
            ))}
          </ol>
        </div>

        <div key={step} className={`finder-step slide-${dir}`}>
          {step === 1 ? (
            <fieldset>
              <legend>น้องของคุณคือ…</legend>
              <div className="choice-grid two">
                {(["cat", "dog"] as Pet[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`choice ${pet === p ? "active" : ""} choice-${p}`}
                    data-testid={`finder-pet-${p}`}
                    aria-pressed={pet === p}
                    onClick={() => {
                      if (pet !== p) setLife(null);
                      setPet(p);
                    }}
                  >
                    <span className="choice-emoji" aria-hidden="true">
                      {PET_EMOJI[p]}
                    </span>
                    <strong>{p === "cat" ? "น้องแมว" : "น้องหมา"}</strong>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {step === 2 ? (
            <fieldset>
              <legend>น้องอยู่ในช่วงวัยไหน?</legend>
              <div className="choice-grid three">
                {(["baby", "adult", "senior"] as LifeStage[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`choice ${life === l ? "active" : ""}`}
                    data-testid={`finder-life-${l}`}
                    aria-pressed={life === l}
                    onClick={() => setLife(l)}
                  >
                    <span className="choice-emoji" aria-hidden="true">
                      {LIFE_EMOJI[l]}
                    </span>
                    <strong>{lifeLabels[l]}</strong>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {step === 3 ? (
            <fieldset>
              <legend>มีความต้องการพิเศษไหม?</legend>
              <div className="pref-grid">
                <label className="check-card" htmlFor="finder-no-chicken">
                  <input
                    type="checkbox"
                    id="finder-no-chicken"
                    data-testid="finder-no-chicken"
                    checked={noChicken}
                    onChange={(e) => setNoChicken(e.target.checked)}
                  />
                  <span>🚫🐔 ไม่เอาสูตรไก่ (แพ้ไก่)</span>
                </label>
                <label className="check-card" htmlFor="finder-grainfree">
                  <input
                    type="checkbox"
                    id="finder-grainfree"
                    data-testid="finder-grainfree"
                    checked={grainFree}
                    onChange={(e) => setGrainFree(e.target.checked)}
                  />
                  <span>🌾 เกรนฟรีเท่านั้น</span>
                </label>
                <div className="field">
                  <label htmlFor="finder-type">ประเภทอาหาร</label>
                  <select
                    id="finder-type"
                    data-testid="finder-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as "any" | FoodType)}
                  >
                    <option value="any">แบบไหนก็ได้</option>
                    <option value="dry">อาหารเม็ด</option>
                    <option value="wet">อาหารเปียก</option>
                    <option value="treat">ขนม</option>
                  </select>
                </div>
              </div>
            </fieldset>
          ) : null}

          {step === 4 && results ? (
            results.length === 0 ? (
              <div className="empty-state" data-testid="finder-empty">
                <span className="empty-emoji" aria-hidden="true">
                  🤔
                </span>
                <h2>ยังไม่พบสินค้าที่ตรงกับเงื่อนไข</h2>
                <p>ลองลดเงื่อนไขพิเศษลงหน่อย แล้วค้นหาใหม่อีกครั้ง</p>
              </div>
            ) : (
              <div>
                <h2 className="results-title">🎯 อาหารที่เหมาะกับน้องที่สุด</h2>
                <ol className="finder-results" data-testid="finder-results">
                  {results.map((r, i) => (
                    <ResultCard key={r.slug} item={r} index={i} />
                  ))}
                </ol>
              </div>
            )
          ) : null}
        </div>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="finder-nav">
          {step > 1 ? (
            <button type="button" className="btn btn-ghost" data-testid="finder-back" onClick={() => go(step - 1)}>
              ← ย้อนกลับ
            </button>
          ) : (
            <span />
          )}
          {step === 1 ? (
            <button type="button" className="btn btn-primary" data-testid="finder-next" disabled={!pet} onClick={() => go(2)}>
              ถัดไป →
            </button>
          ) : null}
          {step === 2 ? (
            <button type="button" className="btn btn-primary" data-testid="finder-next" disabled={!life} onClick={() => go(3)}>
              ถัดไป →
            </button>
          ) : null}
          {step === 3 ? (
            <button type="button" className="btn btn-primary" data-testid="finder-submit" disabled={loading} onClick={submit}>
              {loading ? "กำลังค้นหา…" : "✨ ดูผลลัพธ์"}
            </button>
          ) : null}
          {step === 4 ? (
            <button type="button" className="btn btn-ghost" data-testid="finder-restart" onClick={restart}>
              ↺ เริ่มใหม่
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

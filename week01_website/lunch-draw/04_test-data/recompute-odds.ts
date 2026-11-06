// คิดเงินซ้ำ (double calculation) สำหรับสูตรโอกาส
//
// มีสูตร 2 ชุดที่เขียนแยกกัน:
//   A. expected()  : เขียนใหม่ในไฟล์นี้จาก 02_REQUIREMENTS.md (BR-01 ถึง BR-14) โดยไม่ดูโค้ดแอป
//   B. computeOdds : โค้ดจริงของแอป src/lib/odds.ts
// แล้วเทียบกันทุกร้าน ทุกสถานการณ์ ถ้าต่างกันเกิน 1e-12 ถือว่าผิด
//
// รัน: npx tsx 04_test-data/recompute-odds.ts      (จากโฟลเดอร์ lunch-draw)

import { readFileSync } from "node:fs";
import { computeOdds, type OddsRestaurant } from "../src/lib/odds";

type Seed = { number: number; distance: number; walkDistance: number | null; categories: string[] };
const SEED: Seed[] = JSON.parse(readFileSync("e2e/data/restaurants.json", "utf8"));
const DAY = 24 * 3600 * 1000;
const NOW = Date.parse("2026-11-06T12:00:00+07:00");

// ---------- A. สูตรที่เขียนใหม่จาก requirement ----------
type Scenario = {
  name: string;
  tc?: string;
  lazy?: boolean;
  prices?: number[];
  scores?: Record<string, number>;
  picks?: Record<number, number>;
  edits?: Record<number, Partial<OddsRestaurant>>;
  focus: number[]; // ร้านที่จะพิมพ์ % ออกมาให้คนอ่านเทียบ
};

const voteMult = (net: number) => Math.max(0.1, 1 + 0.5 * net); // BR-03
const walkOf = (r: OddsRestaurant) => (r.walkDistance == null ? Math.round(r.distance * 1.3) : r.walkDistance); // BR-09
function eatenMult(iso: string | null | undefined) {
  // BR-06
  if (!iso) return 1;
  const days = Math.max(0, (NOW - Date.parse(iso)) / DAY);
  return days >= 7 ? 1 : 0.2 + 0.8 * (days / 7);
}
const nearMult = (r: OddsRestaurant, lazy: boolean) => (lazy ? 1 + (1 - Math.min(500, walkOf(r)) / 500) : 1); // BR-08
const ratingMult = (avg: number | null | undefined) =>
  avg == null ? 1 : 0.6 + ((Math.min(4, Math.max(1, avg)) - 1) / 3) * 0.8; // BR-11

function expected(list: OddsRestaurant[], s: Scenario) {
  const scores = s.scores ?? {};
  const picks = s.picks ?? {};
  const keep = list.filter(
    (r) =>
      !r.disabled && // BR-12
      (!s.lazy || walkOf(r) <= 500) && // BR-07
      (!s.prices?.length || s.prices.includes(r.priceLevel ?? 0)), // BR-10
  );
  const w = new Map<number, number>();
  for (const r of keep) {
    const cat = r.categories.length ? Math.max(...r.categories.map((c) => voteMult(scores[c] ?? 0))) : 1; // BR-04
    w.set(
      r.id,
      r.baseWeight * cat * voteMult(picks[r.id] ?? 0) * eatenMult(r.lastEatenAt) * nearMult(r, !!s.lazy) * ratingMult(r.ratingAvg),
    );
  }
  const total = [...w.values()].reduce((a, b) => a + b, 0);
  return new Map([...w].map(([id, x]) => [id, total ? x / total : 0])); // BR-01
}

// BR-14
const fmt = (p: number) => (p === 0 ? "0%" : p < 0.001 ? "<0.1%" : `${(p * 100).toFixed(1)}%`);

// ---------- สถานการณ์ ----------
const daysAgo = (d: number) => new Date(NOW - d * DAY).toISOString();
const SCENARIOS: Scenario[] = [
  { name: "S01 ไม่มีโหวต", tc: "TC-HOME-03", focus: [1, 237] },
  { name: "S02 โหวต + ก๋วยเตี๋ยว", tc: "TC-VOTE-01", scores: { noodle: 1 }, focus: [4, 1] },
  { name: "S03 โหวต − ฝรั่ง", tc: "TC-VOTE-02", scores: { western: -1 }, focus: [] },
  { name: "S04 เส้น −1 ส้มตำ +1 (ร้านหลายแนว)", tc: "TC-VOTE-05", scores: { noodle: -1, isan: 1 }, focus: [222, 4] },
  { name: "S05 ห้อง: ส้มตำ +2", tc: "TC-ROOM-03", scores: { isan: 2 }, focus: [222] },
  { name: "S06 ห้อง: ก๋วยเตี๋ยว −3 ชนพื้น ×0.1", scores: { noodle: -3 }, focus: [4] },
  { name: "S07 โหวตร้าน #4 +1", tc: "TC-VOTE-06", picks: { 4: 1 }, focus: [4] },
  { name: "S08 ขี้เกียจเดิน", tc: "TC-FLT-01/06", lazy: true, focus: [1, 84] },
  { name: "S09 กินร้าน #1 วันนี้", tc: "TC-DRAW-04", edits: { 1: { lastEatenAt: daysAgo(0) } }, focus: [1] },
  { name: "S10 กินร้าน #1 เมื่อ 3.5 วันก่อน", edits: { 1: { lastEatenAt: daysAgo(3.5) } }, focus: [1] },
  { name: "S11 กินร้าน #1 ครบ 7 วัน", edits: { 1: { lastEatenAt: daysAgo(7) } }, focus: [1] },
  { name: "S12 กินในอนาคต (นาฬิกาเพี้ยน) นับเป็นวันนี้", tc: "BUG-01", edits: { 1: { lastEatenAt: daysAgo(-0.01) } }, focus: [1] },
  { name: "S13 น้ำหนักร้าน #2 ×2", tc: "TC-EDIT-06", edits: { 2: { baseWeight: 2 } }, focus: [2] },
  { name: "S14 ราคา ฿ (มีแค่ร้าน #1)", tc: "TC-FLT-03", prices: [1], edits: { 1: { priceLevel: 1 }, 2: { priceLevel: 2 } }, focus: [1] },
  { name: "S15 ราคา ฿ + ฿฿", tc: "TC-FLT-03", prices: [1, 2], edits: { 1: { priceLevel: 1 }, 2: { priceLevel: 2 } }, focus: [1, 2] },
  { name: "S16 ราคา ไม่ระบุ", tc: "TC-FLT-04", prices: [0], edits: { 1: { priceLevel: 1 } }, focus: [2] },
  { name: "S17 คะแนนเฉลี่ย 4 ที่ร้าน #1", tc: "TC-RATE-04", edits: { 1: { ratingAvg: 4 } }, focus: [1] },
  { name: "S18 คะแนนเฉลี่ย 1 ที่ร้าน #1", edits: { 1: { ratingAvg: 1 } }, focus: [1] },
  { name: "S19 ปิดร้าน #1", tc: "TC-EDIT-03", edits: { 1: { disabled: true } }, focus: [2] },
  {
    name: "S20 ผสมทุกตัวคูณ",
    lazy: true,
    scores: { noodle: 2, thai: -1 },
    picks: { 4: 1, 1: -1 },
    edits: { 4: { baseWeight: 1.5, ratingAvg: 2.5, lastEatenAt: daysAgo(3.5) }, 1: { ratingAvg: 4 } },
    focus: [4, 1, 5],
  },
  { name: "S21 ไม่มีร้านผ่านตัวกรอง", tc: "TC-FLT-02", prices: [4], focus: [] },
];

// ---------- รันและเทียบ ----------
function build(edits: Scenario["edits"] = {}): OddsRestaurant[] {
  return SEED.map((r) => ({
    id: r.number,
    baseWeight: 1,
    distance: r.distance,
    walkDistance: r.walkDistance,
    categories: r.categories,
    priceLevel: null,
    lastEatenAt: null,
    ratingAvg: null,
    disabled: false,
    ...edits[r.number],
  }));
}

let failed = 0;
for (const s of SCENARIOS) {
  const list = build(s.edits);
  const exp = expected(list, s);
  const app = computeOdds(list, s.scores ?? {}, { lazy: !!s.lazy, prices: s.prices ?? [] }, NOW, s.picks ?? {});
  let diff = 0;
  if (app.length !== exp.size) diff = Infinity;
  for (const o of app) diff = Math.max(diff, Math.abs(o.p - (exp.get(o.id) ?? NaN)));
  const ok = diff < 1e-12;
  if (!ok) failed++;
  const sum = [...exp.values()].reduce((a, b) => a + b, 0);
  const focus = s.focus.map((n) => `#${n} ${((exp.get(n) ?? 0) * 100).toFixed(4)}% (${fmt(exp.get(n) ?? 0)})`).join(" · ");
  console.log(
    `${ok ? "PASS" : "FAIL"} ${s.name.padEnd(42)} ร้าน ${String(exp.size).padStart(3)} · รวม ${(sum * 100).toFixed(2)}%${focus ? " · " + focus : ""}${s.tc ? ` [${s.tc}]` : ""}`,
  );
}

// สุ่มสถานการณ์ 500 แบบ เทียบสองสูตรอีกรอบ (property-based)
const CATS = [...new Set(SEED.flatMap((r) => r.categories))];
let seed = 20261106;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pickOne = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
let randomFails = 0;
for (let i = 0; i < 500; i++) {
  const edits: Scenario["edits"] = {};
  for (let k = 0; k < 20; k++) {
    edits[pickOne(SEED).number] = {
      baseWeight: pickOne([0.5, 1, 1.5, 2, 5]),
      priceLevel: pickOne([null, 1, 2, 3, 4]),
      lastEatenAt: pickOne([null, daysAgo(rnd() * 9)]),
      ratingAvg: pickOne([null, 1, 1.5, 2.33, 3, 4]),
      disabled: rnd() < 0.1,
    };
  }
  const s: Scenario = {
    name: `R${i}`,
    lazy: rnd() < 0.5,
    prices: rnd() < 0.3 ? [pickOne([0, 1, 2, 3, 4])] : [],
    scores: Object.fromEntries(CATS.filter(() => rnd() < 0.3).map((c) => [c, Math.floor(rnd() * 7) - 3])),
    picks: Object.fromEntries(SEED.filter(() => rnd() < 0.05).map((r) => [r.number, Math.floor(rnd() * 5) - 2])),
    edits,
    focus: [],
  };
  const list = build(edits);
  const exp = expected(list, s);
  const app = computeOdds(list, s.scores!, { lazy: !!s.lazy, prices: s.prices! }, NOW, s.picks);
  const bad = app.length !== exp.size || app.some((o) => Math.abs(o.p - (exp.get(o.id) ?? NaN)) > 1e-12);
  if (bad) randomFails++;
}
console.log(`สุ่มเพิ่ม 500 สถานการณ์: ไม่ตรง ${randomFails} ครั้ง`);
process.exit(failed || randomFails ? 1 : 0);

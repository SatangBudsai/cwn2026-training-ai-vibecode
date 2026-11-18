// SkyThai Plus (v2) — Playwright "playlist": บันทึกวิดีโอ use case ทีละเคส แล้วแปลงเป็น MP4 + GIF
// รัน:  npm install  &&  node playlist.mjs      (ตั้ง BASE_URL ได้ ค่าเริ่มต้น http://localhost:5082)
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL || "http://localhost:5082";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(HERE, "videos-raw");
const MEDIA = path.join(HERE, "media");
const HOLD = 3500;
const SIZE = { width: 1280, height: 800 };
const ONLY = (process.env.ONLY || "").split(",").filter(Boolean); // เช่น ONLY=P1,P7
fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(MEDIA, { recursive: true });

// ข้อมูลจำลองเป็นเที่ยวบินวันที่ 15 พ.ย. 2026 — ใช้ URL ค้นหาเดียวกับที่ฟอร์มสร้าง (P1 ค้นผ่าน UI จริง)
const DATE = "2026-11-15";
const QUERY = `trip=oneway&from=BKK-CITY&to=JP&date=${DATE}&cabin=economy&adults=1&children=0&infantsSeat=0&infantsLap=0`;
const SEARCH = `/search?${QUERY}`;

// ---------- helpers: caption bar + red outline ----------
async function caption(page, text, status = "info") {
  const bg = { info: "rgba(20,24,38,.92)", pass: "rgba(22,128,61,.95)", fail: "rgba(185,28,28,.95)" }[status];
  const icon = { info: "▶", pass: "✔", fail: "✘" }[status];
  await page.evaluate(({ text, bg, icon }) => {
    let bar = document.getElementById("__pw_caption");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "__pw_caption";
      Object.assign(bar.style, {
        position: "fixed", left: "0", right: "0", bottom: "0", zIndex: "2147483647",
        padding: "14px 24px", color: "#fff", font: "600 22px/1.4 Tahoma, 'Leelawadee UI', sans-serif",
        boxShadow: "0 -4px 16px rgba(0,0,0,.25)", pointerEvents: "none", whiteSpace: "pre-wrap",
      });
      document.documentElement.appendChild(bar);
    }
    bar.style.background = bg;
    bar.textContent = `${icon}  ${text}`;
  }, { text, bg, icon }).catch(() => {});
}

async function outline(locator) {
  await locator.first().scrollIntoViewIfNeeded().catch(() => {});
  await locator.evaluateAll((els) => els.forEach((el) => {
    el.style.outline = "4px solid #e11d48";
    el.style.outlineOffset = "3px";
  })).catch(() => {});
}
async function clearOutlines(page) {
  await page.evaluate(() => document.querySelectorAll("[style*='outline']").forEach((el) => { el.style.outline = ""; })).catch(() => {});
}

const hold = (page, ms = HOLD) => page.waitForTimeout(ms);

/** วาดกรอบแดง → ตรวจ → แสดงผลสีเขียว/แดง → ค้าง 3.5 วิ → throw ถ้าไม่ผ่าน */
async function check(page, locator, desc, fn) {
  await clearOutlines(page);
  if (locator) await outline(locator);
  await caption(page, `ตรวจ: ${desc}`, "info");
  await page.waitForTimeout(700);
  let ok = false, info = "";
  try { const r = await fn(); ok = r === true || (r && r.ok); info = (r && r.info) || ""; }
  catch (e) { info = e.message.split("\n")[0]; }
  await caption(page, `${ok ? "ผ่าน" : "ไม่ผ่าน"}: ${desc}${info ? ` — ${info}` : ""}`, ok ? "pass" : "fail");
  await hold(page);
  if (!ok) throw new Error(`${desc}${info ? ` (${info})` : ""}`);
  return info;
}

const priceNum = (s) => Number(String(s).replace(/[^\d]/g, ""));
const prices = async (page) => (await page.getByTestId("flight-price").allTextContents()).map(priceNum);
const ids = async (page) => page.getByTestId("flight-card").evaluateAll((els) => els.map((e) => Number(e.dataset.flightId)));
const nonDecreasing = (a) => a.every((v, i) => i === 0 || a[i - 1] <= v);
const countText = (page) => page.getByTestId("result-count").textContent().then((t) => t.trim());
const baht = (n) => `฿${n.toLocaleString("en-US")}`;
const top = (page) => page.evaluate(() => window.scrollTo(0, 0));

/** โหลดผลค้นหา 15 พ.ย. ผ่าน URL ที่ฟอร์มสร้าง แล้วรอให้รายการขึ้น */
async function openResults(page) {
  await page.goto(BASE + SEARCH);
  await page.getByTestId("flight-card").first().waitFor();
}
async function loadAll(page) {
  const more = page.getByTestId("load-more");
  if (await more.count()) { await outline(more); await page.waitForTimeout(600); await more.click(); }
}

// ลำดับที่คาดหวังของแต่ละโหมดเรียง คำนวณจาก GET /api/flights (กติกาเดียวกับ sorter ใน Results.tsx)
let API = null;
async function apiFlights(page) {
  if (!API) API = await (await page.request.get(`${BASE}/api/flights?${QUERY}`)).json();
  return API.flights;
}
function expectedOrder(flights, sort) {
  const key = {
    popular: (f) => f.displayOrder, price: (f) => f.price,
    depart: (f) => `${f.departDate} ${f.departTime}`, arrive: (f) => `${f.arriveDate} ${f.arriveTime}`,
    duration: (f) => f.durationMin, emissions: (f) => f.co2.g,
  }[sort];
  return [...flights].sort((a, b) => { const x = key(a), y = key(b); return x < y ? -1 : x > y ? 1 : a.displayOrder - b.displayOrder; })
    .map((f) => f.id);
}

// ---------- cases ----------
const shared = {};
const EMAIL = "somchai@example.com";
const NAME = "SOMCHAI JAIDEE";

const cases = [
  {
    id: "P1", title: "ค้นหา กรุงเทพ → ญี่ปุ่น 15 พ.ย. 2026 เรียงถูก→แพง (22 เที่ยวบิน เริ่ม ฿7,635)",
    async run(page) {
      await page.goto(BASE + "/");
      await caption(page, "P1 หน้าแรก — ฟอร์มตั้งค่า กรุงเทพ → ญี่ปุ่น เที่ยวเดียว ผู้ใหญ่ 1 ไว้แล้ว");
      await hold(page, 2000);
      await check(page, page.getByTestId("search-form"), "ต้นทาง กรุงเทพฯ / ปลายทาง ญี่ปุ่น / วันที่เริ่มต้น 15 ธ.ค.", async () => {
        const o = await page.getByTestId("origin").getAttribute("aria-label");
        const d = await page.getByTestId("destination").getAttribute("aria-label");
        const v = (await page.getByTestId("depart-date-value").textContent()).trim();
        return { ok: o.includes("กรุงเทพ") && d.includes("ญี่ปุ่น") && v.includes("15 ธ.ค."), info: `${v} (= วันที่ 15 ของเดือนหน้า)` };
      });
      await caption(page, "ข้อมูลจำลองเป็นของวันที่ 15 พ.ย. — เปิดปฏิทิน ย้อนไปเดือน พ.ย. แล้วเลือกวันที่ 15");
      await outline(page.getByTestId("depart-date"));
      await hold(page, 1500);
      await page.getByTestId("depart-date").click();
      const cal = page.getByTestId("depart-date-calendar");
      await cal.getByRole("button", { name: "เดือนก่อนหน้า" }).click();
      const day = page.getByTestId(`cal-day-${DATE}`).first();
      await outline(day);
      await hold(page, 1200);
      await day.click();
      await page.getByTestId("depart-date-done").click();
      await check(page, page.getByTestId("depart-date"), "ช่องขาไปเปลี่ยนเป็น อา. 15 พ.ย.", async () => {
        const v = (await page.getByTestId("depart-date-value").textContent()).trim();
        return { ok: v === "อา. 15 พ.ย.", info: v };
      });
      await caption(page, "กด “ค้นหาเที่ยวบิน”");
      await outline(page.getByTestId("search-button"));
      await hold(page, 1200);
      await page.getByTestId("search-button").click();
      await page.waitForURL(new RegExp(`/search\\?.*date=${DATE}`));
      await page.getByTestId("flight-card").first().waitFor();
      await check(page, page.getByTestId("results-summary"), "หน้าผลลัพธ์ เที่ยวเดียว วันอาทิตย์ที่ 15 พฤศจิกายน 2569", async () => {
        const t = await page.getByTestId("results-summary").textContent();
        return { ok: t.includes("15 พฤศจิกายน 2569") && t.includes("เที่ยวเดียว"), info: (await page.getByTestId("results-title").textContent()).trim() };
      });
      await check(page, page.getByTestId("result-count"), "มีผลลัพธ์ 22 รายการ", async () => {
        const t = await countText(page); return { ok: t === "มีผลลัพธ์ 22 รายการ", info: t };
      });
      await check(page, page.getByTestId("flight-card").first().getByTestId("flight-price"), "ใบแรกถูกที่สุด ฿7,635", async () => {
        const t = (await page.getByTestId("flight-price").first().textContent()).trim();
        const a = (await page.getByTestId("flight-airlines").first().textContent()).trim();
        return { ok: t === "฿7,635", info: `${t} · ${a}` };
      });
      await caption(page, "กด “ดูเที่ยวบินเพิ่มเติม” เพื่อแสดงครบทุกใบ");
      await loadAll(page);
      await check(page, page.getByTestId("flight-price"), "ครบ 22 ใบ และราคาเรียงจากถูกไปแพง", async () => {
        const p = await prices(page);
        return { ok: p.length === 22 && nonDecreasing(p), info: `${p.length} ใบ · ${baht(p[0])} → ${baht(p.at(-1))}` };
      });
      return "ค้น 15 พ.ย. ผ่านปฏิทิน ได้ 22 เที่ยวบิน เรียงถูก→แพง เริ่ม ฿7,635";
    },
  },
  {
    id: "P2", title: "กฎผู้โดยสาร: ผู้ใหญ่ ≥ 1, รวม ≤ 9, ทารกบนตัก ≤ ผู้ใหญ่",
    async run(page) {
      await page.goto(BASE + "/");
      await caption(page, "P2 เปิดตัวเลือกผู้โดยสาร (👤 1)");
      await outline(page.getByTestId("pax-button"));
      await hold(page, 1200);
      await page.getByTestId("pax-button").click();
      const pop = page.getByTestId("pax-popover");
      const cnt = (k) => page.getByTestId(`pax-${k}-count`).textContent().then(Number);
      await check(page, page.getByTestId("pax-adults-minus"), "C1 ผู้ใหญ่ 1 คน → ปุ่ม − ผู้ใหญ่กดไม่ได้", async () => {
        const dis = await page.getByTestId("pax-adults-minus").isDisabled();
        return { ok: dis && (await cnt("adults")) === 1, info: dis ? "disabled" : "ยังกดได้" };
      });
      await caption(page, "เพิ่มทารกนั่งบนตัก 2 คน (มีผู้ใหญ่ 1 คน)");
      await outline(page.getByTestId("pax-infantsLap-plus"));
      await page.getByTestId("pax-infantsLap-plus").click();
      await page.getByTestId("pax-infantsLap-plus").click();
      await check(page, pop, "C2 ทารกบนตัก 2 > ผู้ใหญ่ 1 → ขึ้นข้อความเตือน และซ่อนปุ่ม “เสร็จ”", async () => {
        const e = await page.getByTestId("pax-error").allTextContents();
        const done = await page.getByTestId("pax-done").count();
        return { ok: e.some((x) => x.includes("ทารกที่นั่งบนตัก")) && done === 0, info: `${e.join(" / ")} · ปุ่มเสร็จ ${done ? "ยังอยู่" : "ถูกซ่อน"}` };
      });
      await caption(page, "เพิ่มผู้ใหญ่เป็น 2 คน (ทารกบนตัก 2 = ผู้ใหญ่ 2)");
      await page.getByTestId("pax-adults-plus").click();
      await check(page, pop, "C4 แก้ให้ถูกแล้ว ข้อความหาย และปุ่ม “เสร็จ” กลับมา", async () => {
        const e = await page.getByTestId("pax-error").count();
        const done = await page.getByTestId("pax-done").isVisible();
        return { ok: e === 0 && done, info: `ผู้ใหญ่ ${await cnt("adults")} · ทารกบนตัก ${await cnt("infantsLap")}` };
      });
      await caption(page, "กด + ผู้ใหญ่ต่อไปเรื่อย ๆ จนเกิน 9 คนรวม");
      const plus = page.getByTestId("pax-adults-plus");
      for (let i = 0; i < 6; i++) await plus.click(); // 8 ผู้ใหญ่ + 2 ทารก = 10
      await check(page, pop, "C3 รวม 10 คน (ผู้ใหญ่ 8 + ทารกบนตัก 2) → “ไม่รองรับผู้โดยสารมากกว่า 9 ท่าน”", async () => {
        const e = await page.getByTestId("pax-error").allTextContents();
        const done = await page.getByTestId("pax-done").count();
        return { ok: e.some((x) => x.includes("มากกว่า 9 ท่าน")) && done === 0, info: e.join(" / ") };
      });
      await plus.click();
      await check(page, page.getByTestId("pax-adults-plus"), "ผู้ใหญ่ 9 คน → ปุ่ม + ผู้ใหญ่กดไม่ได้", async () => {
        const dis = await plus.isDisabled();
        return { ok: dis && (await cnt("adults")) === 9, info: `ผู้ใหญ่ ${await cnt("adults")} · ${dis ? "disabled" : "ยังกดได้"}` };
      });
      await caption(page, "ลดทารกบนตักเหลือ 0 → รวม 9 คนพอดี แล้วกด “เสร็จ”");
      await page.getByTestId("pax-infantsLap-minus").click();
      await page.getByTestId("pax-infantsLap-minus").click();
      await hold(page, 1200);
      await page.getByTestId("pax-done").click();
      await check(page, page.getByTestId("pax-button"), "ปุ่มผู้โดยสารแสดง 👤 9", async () => {
        const t = (await page.getByTestId("pax-button").textContent()).trim();
        return { ok: t.startsWith("👤 9"), info: t };
      });
      return "ผู้ใหญ่ขั้นต่ำ 1, ทารกบนตัก ≤ ผู้ใหญ่, รวมไม่เกิน 9 — ผิดกฎแล้วปุ่มเสร็จหาย";
    },
  },
  {
    id: "P3", title: "แท็บ ดีที่สุด/ถูกที่สุด + เมนูเรียง 6 แบบเปลี่ยนลำดับ",
    async run(page) {
      const exp = await apiFlights(page);
      await openResults(page);
      await caption(page, "P3 ผลค้นหา 15 พ.ย. — ค่าเริ่มต้น: แท็บ “ดีที่สุด” + เรียงตาม “ราคา”");
      await loadAll(page);
      await top(page);
      await hold(page, 1500);
      const sel = page.getByTestId("sort-select");
      await check(page, sel, "เมนูจัดเรียงมีครบ 6 แบบ", async () => {
        const o = await sel.locator("option").allTextContents();
        return { ok: o.length === 6, info: o.join(" · ") };
      });
      const modes = [["popular", "เที่ยวบินยอดนิยม"], ["depart", "เวลาออกเดินทาง"], ["arrive", "เวลาถึง"], ["duration", "ระยะเวลา"], ["emissions", "การปล่อยก๊าซ"], ["price", "ราคา"]];
      let prev = await ids(page);
      for (const [m, label] of modes) {
        await clearOutlines(page);
        await outline(sel);
        await caption(page, `เลือกจัดเรียงตาม “${label}”`);
        await page.waitForTimeout(800);
        await sel.selectOption(m);
        await check(page, page.getByTestId("flight-card").first(), `เรียงตาม “${label}” ตรงกับข้อมูล API และลำดับเปลี่ยน`, async () => {
          const got = await ids(page);
          const want = expectedOrder(exp, m);
          const head = await page.getByTestId("list-heading").textContent();
          return { ok: JSON.stringify(got) === JSON.stringify(want) && JSON.stringify(got) !== JSON.stringify(prev),
            info: `ใบแรก #${got[0]} ${(await page.getByTestId("flight-times").first().textContent()).trim()} · ${head}` };
        });
        prev = await ids(page);
      }
      await caption(page, "เปลี่ยนเป็น “ยอดนิยม” แล้วกดแท็บ “ถูกที่สุด”");
      await sel.selectOption("popular");
      await outline(page.getByTestId("tab-cheapest"));
      await page.waitForTimeout(800);
      await page.getByTestId("tab-cheapest").click();
      await check(page, page.getByTestId("tab-cheapest"), "แท็บถูกที่สุด เรียงราคาถูก→แพง และแสดง “เริ่มต้น ฿7,635”", async () => {
        const p = await prices(page);
        const from = (await page.getByTestId("cheapest-from").textContent()).trim();
        const on = await page.getByTestId("tab-cheapest").getAttribute("aria-selected");
        return { ok: on === "true" && nonDecreasing(p) && from === "เริ่มต้น ฿7,635", info: `${from} · ${baht(p[0])} → ${baht(p.at(-1))}` };
      });
      await caption(page, "C11 เลือก “ระยะเวลา” ในแท็บถูกที่สุด แล้วกลับไปแท็บ “ดีที่สุด”");
      await sel.selectOption("duration");
      await page.waitForTimeout(800);
      await page.getByTestId("tab-best").click();
      await check(page, page.getByTestId("tab-best"), "C11 สลับแท็บแล้วการเรียง “ระยะเวลา” ยังคงอยู่", async () => {
        const v = await sel.inputValue();
        const got = await ids(page);
        return { ok: v === "duration" && JSON.stringify(got) === JSON.stringify(expectedOrder(exp, "duration")), info: `sort=${v}` };
      });
      return "6 โหมดเรียงให้ลำดับตรงกับ API ทุกโหมด, ถูกที่สุดเรียงตามราคา, การเรียงคงอยู่เมื่อสลับแท็บ";
    },
  },
  {
    id: "P4", title: "ตัวกรอง: บินตรง 18 / การบินไทยเท่านั้น 5 / ล้างกลับ 22",
    async run(page) {
      await openResults(page);
      await caption(page, "P4 เปิดชิป “จำนวนครั้งที่แวะพัก” แล้วเลือก “บินตรงเท่านั้น”");
      await outline(page.getByTestId("chip-stops"));
      await hold(page, 1200);
      await page.getByTestId("chip-stops").click();
      await outline(page.getByTestId("stops-0"));
      await page.waitForTimeout(800);
      await page.getByTestId("stops-0").check();
      await page.getByTestId("popover-stops").getByRole("button", { name: "ปิด" }).click();
      await check(page, page.getByTestId("result-count"), "บินตรงเหลือ 18 รายการ และราคาเริ่มต้นเป็น ฿8,172 (C14)", async () => {
        const t = await countText(page);
        const from = (await page.getByTestId("cheapest-from").textContent()).trim();
        return { ok: t === "มีผลลัพธ์ 18 รายการ" && from === "เริ่มต้น ฿8,172", info: `${t} · ${from}` };
      });
      await loadAll(page);
      await check(page, page.getByTestId("flight-stops"), "ทุกใบที่เหลือเป็น “บินตรง”", async () => {
        const s = await page.getByTestId("flight-stops").allTextContents();
        return { ok: s.length === 18 && s.every((x) => x.trim().startsWith("บินตรง")), info: `บินตรง ${s.length}/18` };
      });
      await top(page);
      await caption(page, "กด ✕ บนชิปเพื่อล้างตัวกรองแวะพัก");
      await outline(page.getByTestId("chip-clear-stops"));
      await page.waitForTimeout(800);
      await page.getByTestId("chip-clear-stops").click();
      await check(page, page.getByTestId("result-count"), "ล้างแล้วกลับเป็น 22 รายการ", async () => {
        const t = await countText(page); return { ok: t === "มีผลลัพธ์ 22 รายการ", info: t };
      });
      await caption(page, "เปิดชิป “สายการบิน” แล้วกด “เท่านั้น” ที่การบินไทย (TG)");
      await page.getByTestId("chip-airlines").click();
      const only = page.getByTestId("airline-only-TG");
      await outline(only);
      await hold(page, 1200);
      await only.click();
      await page.getByTestId("popover-airlines").getByRole("button", { name: "ปิด" }).click();
      await check(page, page.getByTestId("result-count"), "การบินไทยเท่านั้น (C15) เหลือ 5 รายการ ทุกใบเป็นการบินไทยล้วน", async () => {
        const t = await countText(page);
        const a = await page.getByTestId("flight-airlines").allTextContents();
        return { ok: t === "มีผลลัพธ์ 5 รายการ" && a.length === 5 && a.every((x) => x.trim() === "การบินไทย"), info: `${t} · ${[...new Set(a.map((x) => x.trim()))].join(", ")}` };
      });
      await caption(page, "เพิ่มตัวกรองบินตรงซ้อน (AND, C13) แล้วเปิด “ตัวกรองทั้งหมด”");
      await page.getByTestId("chip-stops").click();
      await page.getByTestId("stops-0").check();
      await page.getByTestId("popover-stops").getByRole("button", { name: "ปิด" }).click();
      await outline(page.getByTestId("all-filters-button"));
      await page.waitForTimeout(800);
      await check(page, page.getByTestId("all-filters-button"), "ปุ่มแสดงจำนวนตัวกรองที่ใช้ “ตัวกรองทั้งหมด (2)”", async () => {
        const t = (await page.getByTestId("all-filters-button").textContent()).trim();
        return { ok: t.includes("(2)"), info: `${t} · ${await countText(page)}` };
      });
      await page.getByTestId("all-filters-button").click();
      const clear = page.getByTestId("clear-all");
      await outline(clear);
      await caption(page, "ในแผงตัวกรองทั้งหมด กด “ล้างทั้งหมด”");
      await hold(page, 1500);
      await clear.click();
      await check(page, page.getByTestId("all-filters-apply"), "ปุ่มเปลี่ยนเป็น “แสดง 22 เที่ยวบิน”", async () => {
        const t = (await page.getByTestId("all-filters-apply").textContent()).trim();
        return { ok: t === "แสดง 22 เที่ยวบิน", info: t };
      });
      await page.getByTestId("all-filters-apply").click();
      await check(page, page.getByTestId("result-count"), "ปิดแผงแล้วกลับเป็น 22 รายการ ไม่มีตัวกรองค้าง", async () => {
        const t = await countText(page);
        const b = (await page.getByTestId("all-filters-button").textContent()).trim();
        return { ok: t === "มีผลลัพธ์ 22 รายการ" && !b.includes("("), info: `${t} · ${b}` };
      });
      return "บินตรง 18 (เริ่ม ฿8,172), การบินไทยเท่านั้น 5, ล้างทั้งหมดกลับเป็น 22";
    },
  },
  {
    id: "P5", title: "ขยายเที่ยวบินต่อเครื่อง → ขาบิน + จุดแวะพัก",
    async run(page) {
      await openResults(page);
      const first = page.getByTestId("flight-card").first();
      await check(page, first.getByTestId("flight-stops"), "ใบแรก (฿7,635) เป็นเที่ยวบินแวะพัก 1 ครั้ง", async () => {
        const s = (await first.getByTestId("flight-stops").textContent()).trim();
        return { ok: s.startsWith("แวะพัก 1 ครั้ง"), info: `${s} · ${(await first.getByTestId("flight-airlines").textContent()).trim()}` };
      });
      const id = await first.getAttribute("data-flight-id");
      await caption(page, "P5 กดปุ่ม ˅ เพื่อดูรายละเอียดเที่ยวบิน");
      await outline(page.getByTestId(`expand-${id}`));
      await hold(page, 1200);
      await page.getByTestId(`expand-${id}`).click();
      const detail = page.getByTestId(`flight-detail-${id}`);
      await check(page, detail.getByTestId("leg"), "แสดง 2 ขาบิน พร้อมเลขเที่ยวบิน", async () => {
        const legs = await detail.getByTestId("leg").allTextContents();

        const meta = await detail.locator(".leg-meta b").allTextContents();
        return { ok: legs.length === 2 && meta.length === 2, info: `ขาบิน ${legs.length} · ${meta.join(" → ")}` };
      });
      await check(page, detail.getByTestId("layover"), "แสดงกล่องแวะพัก (ระยะเวลา + สนามบินต่อเครื่อง)", async () => {
        const t = (await detail.getByTestId("layover").textContent()).trim();
        return { ok: /^แวะพัก .+\([A-Z]{3}\)/.test(t), info: t };
      });
      await caption(page, "ขยายใบที่ 2 (บินตรง) พร้อมกัน — เปิดได้หลายแถว");
      const second = page.getByTestId("flight-card").nth(1);
      const id2 = await second.getAttribute("data-flight-id");
      await page.getByTestId(`expand-${id2}`).click();
      const d2 = page.getByTestId(`flight-detail-${id2}`);
      await check(page, d2, "ใบบินตรงมี 1 ขาบิน ไม่มีกล่องแวะพัก และใบแรกยังเปิดอยู่", async () => {
        const n = await d2.getByTestId("leg").count();
        const l = await d2.getByTestId("layover").count();
        return { ok: n === 1 && l === 0 && (await detail.isVisible()), info: `ขาบิน ${n} · แวะพัก ${l}` };
      });
      return "เที่ยวบินต่อเครื่องแสดง 2 ขาบิน + จุดแวะพัก, บินตรงแสดง 1 ขา";
    },
  },
  {
    id: "P6", title: "ข้อมูลเชิงลึกด้านราคา / ตารางวันที่ / การ์ดวันที่ถูกกว่า",
    async run(page) {
      await openResults(page);
      await check(page, page.getByTestId("tools-hint"), "C12 เรียงตามราคา → ยังไม่แสดงข้อมูลเชิงลึก (มีข้อความบอกวิธีเปิด)", async () => {
        const n = await page.getByTestId("price-insights").count();
        return { ok: n === 0 && (await page.getByTestId("tools-hint").isVisible()), info: "ซ่อนอยู่" };
      });
      await caption(page, "P6 เปลี่ยนการเรียงเป็น “เที่ยวบินยอดนิยม” (แท็บดีที่สุด)");
      await outline(page.getByTestId("sort-select"));
      await page.waitForTimeout(800);
      await page.getByTestId("sort-select").selectOption("popular");
      await top(page);
      await check(page, page.getByTestId("price-insights"), "แสดงข้อมูลเชิงลึกด้านราคา: ราคาต่ำสุดตอนนี้ ฿7,635", async () => {
        const t = (await page.getByTestId("price-insights").textContent()).replace(/\s+/g, " ");
        const m = /ขณะนี้ราคาเที่ยวบินที่คุณค้นหา(\S+?)ราคา/.exec(t);
        return { ok: t.includes("ราคาต่ำสุดตอนนี้ ฿7,635"), info: `ระดับ “${m ? m[1] : "?"}” · ${(/ช่วงราคาปกติ[^ ]* \S+/.exec(t) || [""])[0]}` };
      });
      await caption(page, "กด “ดูประวัติราคา”");
      await page.getByTestId("price-history-toggle").click();
      await check(page, page.getByTestId("price-history-chart"), "มีกราฟประวัติราคา (61 วันจากฐานข้อมูล)", async () => {
        const t = await page.getByTestId("price-insights").textContent();
        const n = (/ย้อนหลัง (\d+) วัน/.exec(t) || [])[1];
        return { ok: (await page.getByTestId("price-history-chart").isVisible()) && Number(n) > 1, info: `ย้อนหลัง ${n} วัน` };
      });
      await check(page, page.getByTestId("cheaper-date-card"), "การ์ดแนะนำวันที่ถูกกว่าปรากฏ", async () => {
        const t = (await page.getByTestId("cheaper-date-card").locator("b").textContent()).trim();
        return { ok: /เดินทางวันที่ .+ ในราคา ฿[\d,]+/.test(t), info: t };
      });
      await caption(page, "กด “📅 ตารางวันที่”");
      await outline(page.getByTestId("date-grid-button"));
      await page.waitForTimeout(800);
      await page.getByTestId("date-grid-button").click();
      const grid = page.getByTestId("date-grid-modal");
      await check(page, grid, "ตารางวันที่ 8 วัน: 15 พ.ย. ฿7,635 และมีวันที่ถูกที่สุดกำกับ", async () => {
        const cells = await grid.locator(".date-cell").count();
        const own = (await page.getByTestId(`grid-${DATE}`).textContent()).trim();
        const best = (await grid.locator(".date-cell:has(.best)").textContent() || "").trim();
        return { ok: cells === 8 && own.includes("฿7,635") && best.includes("ถูกที่สุด"), info: `15 พ.ย. → ${own.replace("อา. 15 พ.ย.", "")} · ${best}` };
      });
      const bestCell = grid.locator(".date-cell:has(.best)");
      const bestIso = (await bestCell.getAttribute("data-testid")).replace("grid-", "");
      await caption(page, `C25 เลือก ${bestIso} แล้วกด “ยกเลิก” — วันที่ค้นหาต้องไม่เปลี่ยน`);
      await bestCell.click();
      await outline(page.getByTestId("grid-cancel"));
      await page.waitForTimeout(800);
      await page.getByTestId("grid-cancel").click();
      await check(page, page.getByTestId("results-summary"), "C25 กดยกเลิกแล้ว URL/วันที่ยังเป็น 15 พ.ย.", async () => {
        const t = await page.getByTestId("results-summary").textContent();
        return { ok: page.url().includes(`date=${DATE}`) && t.includes("15 พฤศจิกายน"), info: `date=${new URL(page.url()).searchParams.get("date")}` };
      });
      await caption(page, "กด “เปลี่ยนวันที่” บนการ์ดแนะนำวันที่ถูกกว่า");
      const change = page.getByTestId("cheaper-date-change");
      await outline(page.getByTestId("cheaper-date-card"));
      await page.waitForTimeout(1000);
      await change.click();
      await page.waitForURL((u) => !u.toString().includes(`date=${DATE}`));
      await page.getByTestId("results-summary").waitFor();
      await check(page, page.getByTestId("results-summary"), "ไปยังผลค้นหาของวันที่ที่แนะนำ", async () => {
        const d = new URL(page.url()).searchParams.get("date");
        const t = (await page.getByTestId("results-summary").textContent()).split("·")[1].trim();
        return { ok: d === bestIso, info: `date=${d} · ${t}` };
      });
      return `ข้อมูลเชิงลึก + กราฟ, ตารางวันที่ 8 วัน (ถูกสุด ${bestIso}), ยกเลิกไม่เปลี่ยนวัน, การ์ดเปลี่ยนวันที่ได้`;
    },
  },
  {
    id: "P7", title: "จองครบวงจร → รหัสจอง → ค้นใน “ตรวจสอบการจอง” (PostgreSQL)",
    async run(page) {
      await openResults(page);
      await caption(page, "P7 เลือกเที่ยวบินที่ถูกที่สุด (฿7,635)");
      const first = page.getByTestId("flight-card").first();
      await outline(first);
      await hold(page, 1200);
      await first.locator(".flight-row").click();
      await page.waitForURL(/\/booking\/\d+\?/);
      await check(page, page.getByTestId("option-price"), "หน้าจองราคาตรงกับผลค้นหา ฿7,635 (C22)", async () => {
        const t = (await page.getByTestId("option-price").textContent()).trim();
        const tot = (await page.getByTestId("total-price").textContent()).trim();
        return { ok: t === "฿7,635" && tot === "฿7,635", info: `ตัวเลือก ${t} · รวม ${tot}` };
      });
      await page.getByTestId("continue-button").click();
      await caption(page, `กรอกชื่อ ${NAME} และอีเมล ${EMAIL}`);
      await page.getByTestId("input-name").pressSequentially(NAME, { delay: 40 });
      await page.getByTestId("input-email").pressSequentially(EMAIL, { delay: 40 });
      await page.getByTestId("to-confirm-button").click();
      await check(page, page.getByTestId("confirm-step"), "ขั้นยืนยันแสดงชื่อและอีเมลที่กรอก", async () => {
        const n = await page.getByTestId("confirm-name").textContent();
        const e = await page.getByTestId("confirm-email").textContent();
        return { ok: n === NAME && e === EMAIL, info: `${n} · ${e}` };
      });
      await caption(page, "ติ๊กยอมรับว่าเป็นข้อมูลจำลอง แล้วกด “ยืนยันการจอง”");
      await page.getByTestId("agree-checkbox").check();
      await outline(page.getByTestId("confirm-booking-button"));
      await hold(page, 1200);
      await page.getByTestId("confirm-booking-button").click();
      await page.waitForURL(/\/booking\/confirmation\/[A-Z0-9]{6}$/, { timeout: 15000 });
      const ref = (await page.getByTestId("booking-ref").textContent()).trim();
      shared.ref = ref;
      await check(page, page.getByTestId("booking-ref"), "ได้รหัสการจอง 6 ตัวอักษร", async () =>
        ({ ok: /^[A-Z0-9]{6}$/.test(ref), info: `${ref} · สถานะ ${(await page.getByTestId("booking-status").textContent()).trim()}` }));
      await check(page, page.getByTestId("booking-details"), "ใบจองแสดงชื่อ/อีเมล/ยอด ฿7,635", async () => {
        const n = await page.getByTestId("summary-name").textContent();
        const t = (await page.getByTestId("summary-total").textContent()).trim();
        return { ok: n === NAME && t === "฿7,635", info: `${n} · ${t}` };
      });
      await top(page);
      await caption(page, "ไปที่เมนู “ตรวจสอบการจอง”");
      await outline(page.getByTestId("nav-lookup"));
      await hold(page, 1200);
      await page.getByTestId("nav-lookup").click();
      await page.waitForURL(/\/bookings\/lookup/);
      await caption(page, "ลองอีเมลผิดก่อน (other@example.com)");
      await page.getByTestId("lookup-ref").pressSequentially(ref, { delay: 60 });
      await page.getByTestId("lookup-email").pressSequentially("other@example.com", { delay: 30 });
      await page.getByTestId("lookup-submit").click();
      await page.waitForURL(/ref=/);
      await check(page, page.getByTestId("lookup-not-found"), "รหัสถูกแต่อีเมลผิด → ไม่พบการจอง", async () =>
        ({ ok: await page.getByTestId("lookup-not-found").isVisible(), info: (await page.getByTestId("lookup-not-found").textContent()).trim() }));
      await caption(page, `ค้นด้วยรหัส ${ref} + อีเมลที่ใช้จอง`);
      await page.getByTestId("lookup-email").fill("");
      await page.getByTestId("lookup-email").pressSequentially(EMAIL, { delay: 30 });
      await page.getByTestId("lookup-submit").click();
      await page.getByTestId("lookup-found").waitFor();
      await check(page, page.getByTestId("lookup-found"), "พบการจองจากฐานข้อมูล ชื่อ/อีเมล/ยอดตรง", async () => {
        const f = (await page.getByTestId("lookup-found").textContent()).trim();
        const n = await page.getByTestId("summary-name").textContent();
        const e = await page.getByTestId("summary-email").textContent();
        const t = (await page.getByTestId("summary-total").textContent()).trim();
        return { ok: f.includes(ref) && n === NAME && e === EMAIL && t === "฿7,635", info: `${f} · ${n} · ${t}` };
      });
      return `จองได้รหัส ${ref} ฿7,635 และค้นเจอในหน้าตรวจสอบการจอง (อ่านจาก PostgreSQL)`;
    },
  },
  {
    id: "P8", title: "/api/health ok + GET /api/flights JSON เรียงถูก→แพง",
    async run(page) {
      const res = await page.goto(BASE + "/api/health");
      await page.evaluate(() => { document.body.style.fontSize = "48px"; document.body.style.padding = "40px"; });
      await caption(page, "P8 เปิด /api/health ในเบราว์เซอร์");
      await hold(page, 1200);
      await check(page, page.locator("body"), "/api/health ตอบ 200 และ {\"ok\":true}", async () => {
        const body = JSON.parse(await page.locator("body").innerText());
        return { ok: res.status() === 200 && body.ok === true, info: `HTTP ${res.status()} ${JSON.stringify(body)}` };
      });
      const r2 = await page.goto(`${BASE}/api/flights?${QUERY}`);
      const raw = await page.locator("body").innerText();
      const j = JSON.parse(raw);
      // จัดหน้า JSON ให้อ่านง่าย: สรุปหัว + ตาราง id/ราคา + JSON ดิบแบบจัดย่อหน้า
      await page.evaluate((j) => {
        const rows = j.flights.map((f, i) => `<tr><td>${i + 1}</td><td>#${f.id}</td><td>${f.airlines.map((a) => a.code).join("+")}</td><td>${f.departTime}–${f.arriveTime}</td><td>${f.stops === 0 ? "บินตรง" : `แวะ ${f.stops}`}</td><td style="text-align:right;font-weight:700">฿${f.price.toLocaleString("en-US")}</td></tr>`).join("");
        document.body.innerHTML = `<div style="font:15px/1.45 Tahoma,'Leelawadee UI',sans-serif;padding:18px 24px 90px;display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div><h2 style="margin:0 0 6px">GET /api/flights</h2>
            <div id="__meta" style="margin-bottom:8px">mock: <b>${j.mock}</b> · count: <b>${j.count}</b> · date: <b>${j.search.date}</b> · snapshot: ${j.snapshotTravelDate}</div>
            <table id="__tbl" style="border-collapse:collapse;width:100%">${rows}</table></div>
          <pre style="margin:0;font-size:11px;background:#f4f6fa;padding:10px;overflow:hidden;max-height:680px">${JSON.stringify(j, null, 2).replace(/</g, "&lt;").slice(0, 6000)}</pre></div>`;
        document.querySelectorAll("#__tbl td").forEach((td) => { td.style.borderBottom = "1px solid #dde"; td.style.padding = "2px 8px"; });
      }, j);
      await caption(page, "เปิด GET /api/flights?…date=2026-11-15 (ซ้าย: สรุปจาก JSON, ขวา: JSON ดิบ)");
      await hold(page, 1500);
      await check(page, page.locator("#__meta"), "HTTP 200 · mock=true · count=22", async () =>
        ({ ok: r2.status() === 200 && j.mock === true && j.count === 22 && j.flights.length === 22, info: `HTTP ${r2.status()} count=${j.count}` }));
      await check(page, page.locator("#__tbl"), "ราคาใน JSON เรียงจากถูกไปแพง เริ่ม ฿7,635", async () => {
        const p = j.flights.map((f) => f.price);
        return { ok: nonDecreasing(p) && p[0] === 7635, info: `${baht(p[0])} → ${baht(p.at(-1))}` };
      });
      return "health ok และ /api/flights ส่ง 22 เที่ยวบินเรียงถูก→แพง (฿7,635 → ฿" + j.flights.at(-1).price.toLocaleString("en-US") + ")";
    },
  },
].filter((c) => !ONLY.length || ONLY.includes(c.id));

// ---------- runner ----------
const browser = await chromium.launch({ headless: true, slowMo: 250 });
const results = [];
for (const c of cases) {
  const context = await browser.newContext({
    viewport: SIZE, locale: "th-TH", timezoneId: "Asia/Bangkok",
    recordVideo: { dir: RAW, size: SIZE },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const t0 = Date.now();
  let pass = true, detail = "";
  try {
    detail = await c.run(page);
    await clearOutlines(page);
    await caption(page, `${c.id} ผ่านทั้งหมด — ${detail}`, "pass");
    await hold(page);
  } catch (e) {
    pass = false;
    detail = e.message.split("\n")[0];
    await caption(page, `${c.id} ไม่ผ่าน — ${detail}`, "fail");
    await hold(page);
  }
  const ms = Date.now() - t0;
  const video = page.video();
  await context.close();
  const raw = await video.path();
  fs.renameSync(raw, path.join(RAW, `${c.id}.webm`));
  results.push({ id: c.id, title: c.title, pass, detail, ms });
  console.log(`${pass ? "PASS" : "FAIL"} ${c.id} ${c.title} (${ms} ms)${pass ? "" : " — " + detail}`);
}
await browser.close();
fs.writeFileSync(path.join(HERE, "results.json"), JSON.stringify(results, null, 2) + "\n");

// ---------- ffmpeg: mp4 + gif + playlist ----------
const ff = (args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
for (const r of results) {
  const src = path.join(RAW, `${r.id}.webm`);
  ff(["-i", src, "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-pix_fmt", "yuv420p", "-r", "25",
    "-movflags", "+faststart", "-an", path.join(MEDIA, `${r.id}.mp4`)]);
  ff(["-i", src, "-vf",
    // mpdecimate ตัดเฟรมที่ซ้ำกัน (ช่วงค้าง 3.5 วิ) → GIF ใช้ frame delay ยาวแทน ขนาดเล็กลง ~3 เท่า โดยความยาวเท่าเดิม
    "fps=8,mpdecimate,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle",
    "-fps_mode", "vfr", path.join(MEDIA, `${r.id}.gif`)]);
}
if (!ONLY.length) {
  const list = path.join(RAW, "concat.txt");
  fs.writeFileSync(list, results.map((r) => `file '${path.join(MEDIA, `${r.id}.mp4`).replace(/\\/g, "/")}'`).join("\n") + "\n");
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", path.join(MEDIA, "playlist.mp4")]);
}

// ---------- report ----------
console.log("");
console.table(results.map((r) => ({ id: r.id, pass: r.pass ? "PASS" : "FAIL", ms: r.ms, title: r.title, detail: r.detail })));
let sum = 0;
for (const f of fs.readdirSync(MEDIA)) { const s = fs.statSync(path.join(MEDIA, f)).size; sum += s; console.log(`${f.padEnd(14)} ${(s / 1024).toFixed(0)} KB`); }
console.log(`รวม media ${(sum / 1048576).toFixed(1)} MB`);
const failed = results.filter((r) => !r.pass).length;
console.log(failed ? `\n${failed} case(s) FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);

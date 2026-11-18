// SkyThai Mini (v1) — Playwright "playlist": บันทึกวิดีโอ use case ทีละเคส แล้วแปลงเป็น MP4 + GIF
// รัน:  npm install  &&  node playlist.mjs      (ตั้ง BASE_URL ได้ ค่าเริ่มต้น http://localhost:5081)
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL || "http://localhost:5081";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(HERE, "videos-raw");
const MEDIA = path.join(HERE, "media");
const HOLD = 3500;
const SIZE = { width: 1280, height: 800 };
fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(MEDIA, { recursive: true });

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

const hold = (page, ms = HOLD) => page.waitForTimeout(ms);

/** วาดกรอบแดง → ตรวจ → แสดงผลสีเขียว/แดง → ค้าง 3.5 วิ → throw ถ้าไม่ผ่าน */
async function check(page, locator, desc, fn) {
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
const nonDecreasing = (a) => a.every((v, i) => i === 0 || a[i - 1] <= v);
const nonIncreasing = (a) => a.every((v, i) => i === 0 || a[i - 1] >= v);

// ---------- cases ----------
const shared = {};

const cases = [
  {
    id: "C1", title: "หน้าแรกเรียงราคาถูก→แพง (22 เที่ยวบิน, เริ่ม ฿7,635)",
    async run(page) {
      await page.goto(BASE + "/");
      await caption(page, "C1 เปิดหน้าแรก SkyThai Mini — ค่าเริ่มต้นเรียงราคาถูกสุดก่อน");
      await hold(page, 2000);
      const cards = page.getByTestId("flight-card");
      await check(page, page.getByTestId("result-count"), "พบเที่ยวบิน 22 รายการ", async () => {
        const n = await cards.count(); return { ok: n === 22, info: `นับได้ ${n} การ์ด` };
      });
      await check(page, page.getByTestId("flight-price"), "ราคาเรียงจากถูกไปแพง (ไม่ลดลง)", async () => {
        const p = await prices(page);
        return { ok: nonDecreasing(p), info: `฿${p[0].toLocaleString()} → ฿${p.at(-1).toLocaleString()}` };
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      await check(page, cards.first().getByTestId("flight-price"), "เที่ยวบินแรกราคา ฿7,635", async () => {
        const t = (await cards.first().getByTestId("flight-price").textContent()).trim();
        return { ok: t === "฿7,635", info: `ได้ ${t}` };
      });
      await check(page, page.getByTestId("mock-data-notice"), "มีป้ายแจ้ง “ข้อมูลจำลอง”", async () => {
        const v = await page.getByTestId("mock-data-notice").isVisible();
        const t = await page.getByTestId("mock-data-notice").textContent();
        return { ok: v && t.includes("ข้อมูลจำลอง"), info: v ? "มองเห็นได้" : "มองไม่เห็น" };
      });
      return "22 เที่ยวบิน เรียงถูก→แพง เริ่ม ฿7,635 และมีป้ายข้อมูลจำลอง";
    },
  },
  {
    id: "C2", title: "เปลี่ยนการเรียง / ตัวกรองบินตรง (18 เที่ยวบิน)",
    async run(page) {
      await page.goto(BASE + "/");
      await caption(page, "C2 คลิกปุ่ม “ราคาแพงสุด” เพื่อเปลี่ยนการเรียง");
      await outline(page.getByTestId("sort-price_desc"));
      await hold(page, 1500);
      await page.getByTestId("sort-price_desc").click();
      await page.waitForURL(/sort=price_desc/);
      await check(page, page.getByTestId("flight-price"), "ราคาเรียงจากแพงไปถูก (ไม่เพิ่มขึ้น)", async () => {
        const p = await prices(page);
        return { ok: p.length === 22 && nonIncreasing(p), info: `แรกสุด ฿${p[0].toLocaleString()} · ท้ายสุด ฿${p.at(-1).toLocaleString()}` };
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      await caption(page, "คลิกปุ่ม “บินเร็วสุด”");
      await page.getByTestId("sort-duration").click();
      await page.waitForURL(/sort=duration/);
      await check(page, page.getByTestId("flight-duration"), "ระยะเวลาบินเรียงจากสั้นไปยาว", async () => {
        const mins = (await page.getByTestId("flight-duration").allTextContents()).map((s) => {
          const h = /(\d+)\s*ชม/.exec(s), m = /(\d+)\s*นาที/.exec(s);
          return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
        });
        return { ok: mins.every((v) => v > 0) && nonDecreasing(mins), info: `${mins[0]} → ${mins.at(-1)} นาที` };
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      await caption(page, "กลับไปเรียงราคาถูกสุด แล้วกด “บินตรงเท่านั้น”");
      await page.getByTestId("sort-price_asc").click();
      await page.waitForURL(/sort=price_asc/);
      await outline(page.getByTestId("filter-nonstop"));
      await hold(page, 1500);
      await page.getByTestId("filter-nonstop").click();
      await page.waitForURL(/nonstop=1/);
      await check(page, page.getByTestId("result-count"), "ตัวกรองบินตรงเหลือ 18 เที่ยวบิน", async () => {
        const n = await page.getByTestId("flight-card").count();
        const t = (await page.getByTestId("result-count").textContent()).trim();
        return { ok: n === 18 && t.includes("18"), info: `${t} / นับการ์ดได้ ${n}` };
      });
      await check(page, page.getByTestId("flight-stops"), "ทุกใบเป็น “บินตรง” และยังเรียงถูก→แพง", async () => {
        const s = await page.getByTestId("flight-stops").allTextContents();
        const p = await prices(page);
        return { ok: s.every((x) => x.trim().startsWith("บินตรง")) && nonDecreasing(p), info: `บินตรง ${s.filter((x) => x.includes("บินตรง")).length}/${s.length}` };
      });
      return "เรียงแพง→ถูก, เร็วสุด และกรองบินตรงได้ 18 เที่ยวบิน";
    },
  },
  {
    id: "C3", title: "ฟอร์มตรวจข้อมูลผู้โดยสาร (ข้อมูลว่าง/ผิด)",
    async run(page) {
      await page.goto(BASE + "/");
      await caption(page, "C3 เลือกเที่ยวบินถูกสุด แล้วลองส่งฟอร์มเปล่า");
      const sel = page.getByTestId("flight-card").first().getByTestId("select-flight");
      await outline(sel);
      await hold(page, 1200);
      await sel.click();
      await page.waitForURL(/\/book\/\d+/);
      const formUrl = page.url();
      await caption(page, "กด “ถัดไป” โดยไม่กรอกอะไรเลย");
      await hold(page, 1200);
      await page.getByTestId("review-booking").click();
      await check(page, page.getByTestId("form-error"), "ขึ้นข้อความ “กรุณากรอกชื่อ-นามสกุล”", async () => {
        const t = await page.getByTestId("form-error").textContent({ timeout: 3000 });
        return { ok: t.includes("กรุณากรอกชื่อ"), info: t };
      });
      await caption(page, "กรอกชื่อ แต่ใส่อีเมลผิดรูปแบบ “somchai@” แล้วกดถัดไป");
      await page.getByTestId("input-name").fill("SOMCHAI JAIDEE");
      await page.getByTestId("input-email").fill("somchai@");
      await page.getByTestId("review-booking").click();
      await check(page, page.getByTestId("form-error"), "ขึ้นข้อความ “รูปแบบอีเมลไม่ถูกต้อง”", async () => {
        const t = await page.getByTestId("form-error").textContent({ timeout: 3000 });
        return { ok: t.includes("รูปแบบอีเมลไม่ถูกต้อง"), info: t };
      });
      await check(page, page.getByTestId("booking-form"), "ยังอยู่หน้าฟอร์ม ไม่ไปขั้นยืนยัน/ไม่จอง", async () => {
        const stay = page.url() === formUrl;
        const form = await page.getByTestId("booking-form").isVisible();
        const conf = await page.getByTestId("confirm-step").count();
        return { ok: stay && form && conf === 0, info: `URL ${new URL(page.url()).pathname}` };
      });
      return "ฟอร์มว่างและอีเมลผิดถูกปฏิเสธ และยังอยู่หน้าฟอร์ม";
    },
  },
  {
    id: "C4", title: "จองสำเร็จ + บันทึกลงฐานข้อมูล",
    async run(page) {
      await page.goto(BASE + "/");
      await caption(page, "C4 เลือกเที่ยวบินถูกสุด (฿7,635)");
      const first = page.getByTestId("flight-card").first();
      await outline(first.getByTestId("select-flight"));
      await hold(page, 1200);
      await first.getByTestId("select-flight").click();
      await page.waitForURL(/\/book\/\d+/);
      await caption(page, "กรอกชื่อ SOMCHAI JAIDEE และอีเมล somchai@example.com");
      await page.getByTestId("input-name").pressSequentially("SOMCHAI JAIDEE", { delay: 40 });
      await page.getByTestId("input-email").pressSequentially("somchai@example.com", { delay: 40 });
      await page.getByTestId("review-booking").click();
      await check(page, page.getByTestId("confirm-step"), "หน้ายืนยันแสดงชื่อ อีเมล และยอด ฿7,635", async () => {
        const n = await page.getByTestId("confirm-name").textContent();
        const e = await page.getByTestId("confirm-email").textContent();
        const t = await page.getByTestId("confirm-total").textContent();
        return { ok: n === "SOMCHAI JAIDEE" && e === "somchai@example.com" && t === "฿7,635", info: `${n} · ${e} · ${t}` };
      });
      await caption(page, "กด “ยืนยันการจอง”");
      await outline(page.getByTestId("confirm-booking"));
      await hold(page, 1200);
      await page.getByTestId("confirm-booking").click();
      await page.waitForURL(/\/booking\/STM-[A-Z0-9]{6}$/, { timeout: 15000 });
      const code = (await page.getByTestId("booking-code").textContent()).trim();
      shared.code = code;
      await check(page, page.getByTestId("booking-code"), "ได้รหัสการจองรูปแบบ STM-XXXXXX", async () =>
        ({ ok: /^STM-[A-Z0-9]{6}$/.test(code), info: code }));
      await check(page, page.getByTestId("summary-total"), "ยอดรวมในใบจอง ฿7,635", async () => {
        const t = (await page.getByTestId("summary-total").textContent()).trim();
        return { ok: t === "฿7,635", info: t };
      });
      await caption(page, `โหลดหน้า /booking/${code} ใหม่ (ข้อมูลต้องมาจาก PostgreSQL)`);
      await hold(page, 1500);
      await page.reload();
      await check(page, page.getByTestId("booking-summary"), "รีโหลดแล้วยังเจอใบจอง ชื่อ/อีเมล/ยอดตรง (บันทึกลง DB แล้ว)", async () => {
        const c = (await page.getByTestId("booking-code").textContent()).trim();
        const n = await page.getByTestId("summary-name").textContent();
        const e = await page.getByTestId("summary-email").textContent();
        const t = await page.getByTestId("summary-total").textContent();
        return { ok: c === code && n === "SOMCHAI JAIDEE" && e === "somchai@example.com" && t === "฿7,635", info: `${c} · ${n}` };
      });
      return `จองได้รหัส ${code} ราคา ฿7,635 และรีโหลดแล้วยังอยู่ (persisted)`;
    },
  },
  {
    id: "C5", title: "/api/health ตอบ ok + หน้า 404 รหัสจองที่ไม่มีอยู่",
    async run(page) {
      const res = await page.goto(BASE + "/api/health");
      await page.evaluate(() => { document.body.style.fontSize = "48px"; document.body.style.padding = "40px"; });
      await caption(page, "C5 เปิด /api/health ในเบราว์เซอร์");
      await hold(page, 1200);
      await check(page, page.locator("body"), "/api/health ตอบ 200 และ {\"ok\":true}", async () => {
        const body = JSON.parse(await page.locator("body").innerText());
        return { ok: res.status() === 200 && body.ok === true, info: `HTTP ${res.status()} ${JSON.stringify(body)}` };
      });
      const r404 = await page.goto(BASE + "/booking/STM-ZZZZZZ");
      await caption(page, "เปิด /booking/STM-ZZZZZZ (รหัสจองที่ไม่มีอยู่)");
      await hold(page, 1200);
      await check(page, page.getByTestId("not-found"), "แสดงหน้า “ไม่พบหน้าที่ต้องการ” และ HTTP 404", async () => {
        const v = await page.getByTestId("not-found").isVisible();
        return { ok: v && r404.status() === 404, info: `HTTP ${r404.status()}` };
      });
      const rBad = await page.goto(BASE + "/booking/hello");
      await caption(page, "เปิด /booking/hello (รูปแบบรหัสผิด)");
      await hold(page, 1000);
      await check(page, page.getByTestId("not-found"), "รหัสรูปแบบผิดก็ได้หน้า 404 เช่นกัน", async () => {
        const v = await page.getByTestId("not-found").isVisible();
        return { ok: v && rBad.status() === 404, info: `HTTP ${rBad.status()}` };
      });
      return "health ok และรหัสจองที่ไม่มี/รูปแบบผิดได้ 404";
    },
  },
];

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
  console.log(`${pass ? "PASS" : "FAIL"} ${c.id} ${c.title} (${ms} ms)`);
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
    "fps=8,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
    path.join(MEDIA, `${r.id}.gif`)]);
}
const list = path.join(RAW, "concat.txt");
fs.writeFileSync(list, results.map((r) => `file '${path.join(MEDIA, `${r.id}.mp4`).replace(/\\/g, "/")}'`).join("\n") + "\n");
ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", path.join(MEDIA, "playlist.mp4")]);

// ---------- report ----------
console.log("");
console.table(results.map((r) => ({ id: r.id, pass: r.pass ? "PASS" : "FAIL", ms: r.ms, title: r.title, detail: r.detail })));
for (const f of fs.readdirSync(MEDIA)) console.log(`${f.padEnd(14)} ${(fs.statSync(path.join(MEDIA, f)).size / 1024).toFixed(0)} KB`);
const failed = results.filter((r) => !r.pass).length;
console.log(failed ? `\n${failed} case(s) FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);

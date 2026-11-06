// Turn the Playwright video of every test into a GIF (at least 5 s long) and build
// e2e/report/gifs/index.html to browse them. Reads e2e/report/results.json.
// Run after `npm run e2e`:  npm run e2e:gifs
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import ffmpeg from "ffmpeg-static";

const MIN_SECONDS = 5.5;
const OUT = "e2e/report/gifs";
const report = JSON.parse(readFileSync("e2e/report/results.json", "utf8"));
const cases = new Map(JSON.parse(readFileSync("e2e/test-cases.json", "utf8")).map((c) => [c.id, c]));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const tests = [];
const walk = (suite) => {
  for (const spec of suite.specs ?? []) {
    const id = spec.title.match(/TC-[A-Z]+-\d+/)?.[0];
    if (!id) continue;
    const r = spec.tests[0].results.at(-1) ?? { status: "skipped", attachments: [] };
    const video = (r.attachments ?? []).find((a) => a.name === "video" && a.path);
    tests.push({
      id,
      prio: spec.title.match(/@(P\d)/)?.[1] ?? "",
      title: cases.get(id)?.title ?? spec.title,
      module: cases.get(id)?.module ?? "",
      status: r.status === "passed" ? "pass" : r.status === "skipped" ? "skip" : "fail",
      video: video?.path,
    });
  }
  (suite.suites ?? []).forEach(walk);
};
report.suites.forEach(walk);

const duration = (file) => {
  const err = spawnSync(ffmpeg, ["-i", file], { encoding: "utf8" }).stderr;
  const m = err.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
};

for (const t of tests) {
  if (!t.video || !existsSync(t.video)) {
    t.gif = null;
    continue;
  }
  const len = duration(t.video);
  const pad = Math.max(0, MIN_SECONDS - len);
  // hold the last frame so short tests still show their end state
  const vf = `fps=6,scale=720:-1:flags=lanczos,tpad=stop_mode=clone:stop_duration=${pad.toFixed(2)},split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`;
  const file = path.join(OUT, `${t.id}.gif`);
  spawnSync(ffmpeg, ["-y", "-i", t.video, "-vf", vf, "-loop", "0", file], { encoding: "utf8" });
  t.gif = existsSync(file) ? `${t.id}.gif` : null;
  t.seconds = t.gif ? Number(duration(file).toFixed(1)) : 0;
}

tests.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(path.join(OUT, "gifs.json"), JSON.stringify(tests.map((t) => ({ ...t, video: undefined })), null, 2));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const pass = tests.filter((t) => t.status === "pass").length;
const label = { pass: "ผ่าน", fail: "ล้ม", skip: "ข้าม" };
const cards = tests
  .map(
    (t) => `<section class="card ${t.status}" data-status="${t.status}">
  <h3><span class="id">${t.id}</span> <span class="prio">${t.prio}</span> <span class="badge">${label[t.status]}</span></h3>
  <p>${esc(t.module)} · ${esc(t.title)}</p>
  ${t.gif ? `<img loading="lazy" src="${t.gif}" alt="${t.id}">` : "<p class='none'>ไม่มี GIF: test นี้เรียก API โดยไม่เปิดหน้าเว็บ</p>"}
</section>`,
  )
  .join("\n");

writeFileSync(
  path.join(OUT, "index.html"),
  `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ข้าวไหนดี · ผล E2E</title>
<style>
:root{color-scheme:dark}body{margin:0;padding:24px;background:#141415;color:#ededed;font-family:Tahoma,system-ui,sans-serif}
h1{font-size:20px;font-weight:500;margin:0 0 4px}.sub{color:#a1a1a6;margin:0 0 16px;font-size:14px}
.filters button{background:#232325;color:#ededed;border:1px solid rgba(237,237,237,.14);border-radius:8px;padding:6px 14px;margin-right:8px;cursor:pointer}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:16px;margin-top:16px}
.card{background:#19191b;border:1px solid rgba(237,237,237,.08);border-radius:14px;padding:12px}
.card h3{font-size:14px;font-weight:500;margin:0 0 4px;display:flex;gap:8px;align-items:center}
.card p{margin:0 0 8px;color:#a1a1a6;font-size:13px}.card img{width:100%;border-radius:8px;display:block}
.id{font-family:ui-monospace,monospace}.prio{color:#85858b;font-size:12px}
.badge{margin-left:auto;font-size:12px;padding:2px 8px;border-radius:6px;background:rgba(76,195,138,.15);color:#4cc38a}
.fail .badge{background:rgba(229,72,77,.15);color:#e5484d}.skip .badge{background:#232325;color:#85858b}
.fail{border-color:rgba(229,72,77,.5)}.none{font-style:normal;color:#85858b}
</style></head><body>
<h1>ผล E2E · ข้าวไหนดี</h1>
<p class="sub">${tests.length} test case · ผ่าน ${pass} · ล้ม ${tests.filter((t) => t.status === "fail").length} · ข้าม ${tests.filter((t) => t.status === "skip").length}</p>
<div class="filters"><button onclick="f('all')">ทั้งหมด</button><button onclick="f('pass')">ผ่าน</button><button onclick="f('fail')">ล้ม</button></div>
<div class="grid">
${cards}
</div>
<script>function f(s){document.querySelectorAll('.card').forEach(c=>c.style.display=(s==='all'||c.dataset.status===s)?'':'none')}</script>
</body></html>`,
);

const made = tests.filter((t) => t.gif);
console.log(`tests=${tests.length} pass=${pass} gifs=${made.length} (no GIF for API-only tests: ${tests.length - made.length})`);
if (made.length) console.log("GIF length:", Math.min(...made.map((t) => t.seconds)), "-", Math.max(...made.map((t) => t.seconds)), "s");

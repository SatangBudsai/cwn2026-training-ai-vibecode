// GIF kit: แต่ละ GIF = HTML + CSS animation · จับเฟรมแบบกำหนดเวลาได้ (ไม่ขึ้นกับความเร็วเครื่อง)
// ใช้: import { gif, photo, esc } from './kit.mjs'; await gif('out.gif', {dur:10, html:'...'})
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXE = process.env.CHROME_EXE;
const f = (p) => pathToFileURL(join(HERE, 'node_modules/@fontsource', p)).href;
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const photo = (p) => pathToFileURL(resolve(p)).href;

export const CSS = `
@font-face{font-family:Serif;font-weight:700;src:url(${f('noto-serif-thai/files/noto-serif-thai-thai-700-normal.woff2')})}
@font-face{font-family:Serif;font-weight:500;src:url(${f('noto-serif-thai/files/noto-serif-thai-thai-500-normal.woff2')})}
@font-face{font-family:Sara;font-weight:400;src:url(${f('sarabun/files/sarabun-thai-400-normal.woff2')})}
@font-face{font-family:Sara;font-weight:600;src:url(${f('sarabun/files/sarabun-thai-600-normal.woff2')})}
@font-face{font-family:Sara;font-weight:700;src:url(${f('sarabun/files/sarabun-thai-700-normal.woff2')})}
@font-face{font-family:Sara;font-weight:400;src:url(${f('sarabun/files/sarabun-latin-400-normal.woff2')})}
@font-face{font-family:Sara;font-weight:600;src:url(${f('sarabun/files/sarabun-latin-600-normal.woff2')})}
@font-face{font-family:Sara;font-weight:700;src:url(${f('sarabun/files/sarabun-latin-700-normal.woff2')})}
:root{--leaf:#17392b;--leaf2:#234f3c;--gold:#c9a24b;--gold2:#e6c97a;--cream:#f8f3e6;--ink:#1d2a24;--red:#c0392b;--green:#2e8b57;--amber:#d98a1f;--blue:#2f6db0}
*{box-sizing:border-box;margin:0}
html,body{width:1280px;height:720px;overflow:hidden;background:var(--leaf);font-family:Sara,'Leelawadee UI',sans-serif;color:var(--cream)}
.bg{position:absolute;inset:0;background-size:cover;background-position:center}
.shade{position:absolute;inset:0;background:linear-gradient(100deg,rgba(13,31,23,.93) 0%,rgba(13,31,23,.78) 55%,rgba(13,31,23,.55) 100%)}
.shade.full{background:rgba(13,31,23,.86)}
.shade.lite{background:linear-gradient(180deg,rgba(13,31,23,.72),rgba(13,31,23,.2) 40%,rgba(13,31,23,.82))}
h1{font-family:Serif;font-weight:700;font-size:46px;line-height:1.28;color:var(--cream)}
h2{font-family:Serif;font-weight:700;font-size:32px;line-height:1.3;color:var(--gold2)}
.kick{font-size:21px;letter-spacing:.06em;color:var(--gold2);font-weight:600}
.sub{font-size:25px;line-height:1.5;color:#efe9d8}
.abs{position:absolute}
.card{background:var(--cream);color:var(--ink);border-radius:18px;padding:18px 22px;box-shadow:0 14px 36px rgba(0,0,0,.42);border:1.5px solid rgba(201,162,75,.75)}
.card.dark{background:rgba(23,57,43,.92);color:var(--cream)}
.card h3{font-family:Serif;font-size:26px;line-height:1.3;color:var(--leaf)}
.card.dark h3{color:var(--gold2)}
.card p,.card li{font-size:21px;line-height:1.45}
.tag{display:inline-block;border-radius:10px;padding:2px 12px;font-weight:700;font-size:20px;color:#fff}
.D{background:var(--green)}.R{background:#b58a1f}.A{background:var(--amber)}.O{background:var(--red)}.P1{background:var(--red)}.P2{background:var(--amber)}.P3{background:#6f8f7f}
.mono{font-family:Consolas,'Sara',monospace}
.port{border-radius:50%;object-fit:cover;object-position:50% 16%;border:3px solid var(--gold);box-shadow:0 8px 22px rgba(0,0,0,.5);display:block}
.ph{object-fit:cover;border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,.45);border:2px solid rgba(230,201,122,.7);display:block}
.in{opacity:0;animation:in .7s cubic-bezier(.2,.8,.2,1) var(--d,0s) both}
.left{opacity:0;animation:left .7s cubic-bezier(.2,.8,.2,1) var(--d,0s) both}
.right{opacity:0;animation:right .7s cubic-bezier(.2,.8,.2,1) var(--d,0s) both}
.pop{opacity:0;animation:pop .55s cubic-bezier(.2,1.5,.4,1) var(--d,0s) both}
.stamp{opacity:0;animation:stamp .4s cubic-bezier(.3,1.5,.5,1) var(--d,0s) both}
.fade{opacity:0;animation:fadein .6s linear var(--d,0s) both}
.out{animation:fadeout .5s linear var(--o,5s) both}
.scene{position:absolute;inset:0;opacity:0;animation:scene var(--len,4s) linear var(--d,0s) both}
.grow{transform-origin:0 50%;animation:grow var(--t,.8s) ease-out var(--d,0s) both}
.growv{transform-origin:50% 0;animation:growv var(--t,.8s) ease-out var(--d,0s) both}
.type{display:inline-block;overflow:hidden;white-space:nowrap;vertical-align:bottom;animation:type var(--t,1.5s) steps(40) var(--d,0s) both}
.pulse{animation:pulse 1.2s ease-in-out var(--d,0s) infinite}
.move{animation:move var(--t,1.2s) ease-in-out var(--d,0s) both}
@keyframes kb{from{transform:scale(1.02)}to{transform:scale(1.12)}}
@keyframes in{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
@keyframes left{from{opacity:0;transform:translateX(-46px)}to{opacity:1;transform:none}}
@keyframes right{from{opacity:0;transform:translateX(46px)}to{opacity:1;transform:none}}
@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@keyframes stamp{from{opacity:0;transform:scale(2.2) rotate(-10deg)}to{opacity:1;transform:scale(1) rotate(-5deg)}}
@keyframes fadein{to{opacity:1}}
@keyframes fadeout{to{opacity:0}}
@keyframes scene{0%{opacity:0}7%{opacity:1}93%{opacity:1}100%{opacity:0}}
@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes growv{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes type{from{width:0}to{width:var(--w,100%)}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(230,201,122,.8)}50%{box-shadow:0 0 0 12px rgba(230,201,122,0)}}
@keyframes move{from{transform:translate(var(--x0,0),var(--y0,0));opacity:0}15%{opacity:1}to{transform:translate(var(--x1,0),var(--y1,0));opacity:1}}
`;

export async function gif(out, { dur, html, css = '', fps = 8, width = 1000, colors = 192, dither = 'none' }) {
  if (dur < 9) throw new Error(out + ': GIF สั้นกว่า 9 วินาที');
  const tmp = join(HERE, 'tmp', out.replace(/[^a-z0-9]/gi, '_').slice(-60));
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  const page = join(tmp, 'p.html');
  writeFileSync(page, `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}${css}:root{--dur:${dur}s}</style></head><body>${html}</body></html>`);
  const b = await chromium.launch({ executablePath: EXE });
  const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await pg.goto(pathToFileURL(page).href, { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  const n = Math.round(dur * fps);
  for (let k = 0; k < n; k++) {
    const t = (k / fps) * 1000;
    await pg.evaluate((t) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; } }, t);
    await pg.screenshot({ path: join(tmp, `f${String(k).padStart(4, '0')}.png`) });
  }
  await b.close();
  mkdirSync(dirname(resolve(out)), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(tmp, 'f%04d.png'),
    '-vf', `scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=${colors}:stats_mode=diff[p];[b][p]paletteuse=dither=${dither}:diff_mode=rectangle`, resolve(out)]);
  const mid = join(tmp, `f${String(Math.round(n * 0.85)).padStart(4, '0')}.png`);
  rmSync(tmp + '-last.png', { force: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mid, '-vf', 'scale=640:-1', '-q:v', '4', resolve(out).replace(/\.gif$/, '.__prev.jpg')]);
  rmSync(tmp, { recursive: true, force: true });
  const kb = Math.round(readFileSync(resolve(out)).length / 1024);
  console.log(out.split('/').pop(), dur + 's', kb + 'KB');
}

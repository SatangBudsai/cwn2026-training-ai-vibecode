#!/usr/bin/env node
// สร้าง test-report/index.html: GIF ทุกข้อเรียงตามลำดับในแผน + ป้ายผ่าน/ล้ม + ปุ่มกรอง ทั้งหมด/ผ่าน/ล้ม
// ใช้: node build-index.mjs   (รันใน e2e/ หลัง make-gifs.mjs)  ข้อมูล: plan.json + test-report/results.json
import fs from 'node:fs';
import { loadPlan, loadResults, gifSeconds, esc } from './_lib.mjs';

const plan = loadPlan();
const { results, byId } = loadResults(plan);
const rows = plan.cases.map(c => {
  const r = byId.get(c.id);
  const gif = `gifs/${c.id}.gif`;
  return { ...c, ok: !!r?.ok, st: r?.status ?? 'missing', err: (r?.error ?? '').split('\n').slice(0, 6).join('\n'), gif, sec: gifSeconds(`test-report/${gif}`) };
});
const pass = rows.filter(r => r.ok).length, fail = rows.length - pass;
const when = new Date(results.stats?.startTime ?? Date.now()).toLocaleString('th-TH');
const prioColor = { P1: '#d64545', P2: '#d9a21b', P3: '#2f9e5b' };

const cards = rows.map(r => `<article class="card ${r.ok ? 'ok' : 'ng'}" id="${r.id}" data-st="${r.ok ? 'pass' : 'fail'}">
<header><span class="no">#${r.no}</span><b>${esc(r.id)}</b><span class="pr" style="background:${prioColor[r.priority] ?? '#777'}">${esc(r.priority)}</span><span class="badge">${r.ok ? '✅ ผ่าน' : r.st === 'missing' ? '⚪ ไม่ได้รัน' : '❌ ล้ม'}</span></header>
<p class="what">${esc(r.module)} · ${esc(r.what)}</p><p class="exp">คาดหวัง: ${esc(r.expected)}</p>
${r.err ? `<pre class="err">${esc(r.err)}</pre>` : ''}
${r.sec ? `<img loading="lazy" src="${r.gif}" alt="GIF ${esc(r.id)}"><p class="meta">GIF ${r.sec.toFixed(1)} วินาที · <a href="${r.gif}">เปิดไฟล์</a></p>` : '<p class="meta">ไม่มี GIF</p>'}
</article>`).join('\n');

const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Test Evidence</title><style>
:root{--bg:#fffaf5;--card:#fff;--fg:#2b2118;--mut:#7d6e60;--ok:#2f9e5b;--ng:#d64545;--line:#eadfd3}
@media (prefers-color-scheme:dark){:root{--bg:#1d1814;--card:#29221c;--fg:#f4ebe1;--mut:#a89786;--line:#3d332b}}
*{box-sizing:border-box}body{margin:0;padding:20px 16px;background:var(--bg);color:var(--fg);font-family:system-ui,"Segoe UI",Tahoma,sans-serif}
h1{margin:0 0 4px}.sub{color:var(--mut);margin:0 0 16px}
.stats{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 16px}.stat b{font-size:28px;display:block}
.f{display:flex;gap:8px;margin:12px 0}.f button{border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:20px;padding:6px 14px;cursor:pointer}.f button.on{background:var(--fg);color:var(--bg)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}.chips a{font-size:12px;padding:3px 8px;border-radius:8px;text-decoration:none;color:#fff}.chips a.ok{background:var(--ok)}.chips a.ng{background:var(--ng)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--line);border-left:6px solid var(--ok);border-radius:12px;padding:12px}.card.ng{border-left-color:var(--ng)}
.card header{display:flex;gap:8px;align-items:center}.no{color:var(--mut)}.badge{margin-left:auto;font-weight:700}.ng .badge{color:var(--ng)}.ok .badge{color:var(--ok)}
.pr{font-size:11px;padding:1px 6px;border-radius:6px;color:#fff}
.what{margin:6px 0 2px}.exp{margin:0 0 8px;color:var(--mut);font-size:14px}.err{white-space:pre-wrap;font-size:12px;background:rgba(214,69,69,.1);padding:8px;border-radius:8px;overflow:auto}
.card img{width:100%;border-radius:8px;border:1px solid var(--line)}.meta{font-size:12px;color:var(--mut);margin:6px 0 0}.meta a{color:inherit}
@media (max-width:400px){.grid{grid-template-columns:1fr}}
</style></head><body>
<h1>หลักฐานการทดสอบ</h1><p class="sub">${esc(plan.baseURL)} · รันล่าสุด ${esc(when)} · Chromium (Playwright ${esc(results.config?.version ?? '')}) · แผน ${esc(plan.planFile)}</p>
<div class="stats"><div class="stat">ทั้งหมด<b>${rows.length}</b></div><div class="stat">ผ่าน<b style="color:var(--ok)">${pass}</b></div><div class="stat">ล้ม<b style="color:var(--ng)">${fail}</b></div><div class="stat">อัตราผ่าน<b>${(pass / rows.length * 100).toFixed(1)}%</b></div></div>
<div class="f"><button class="on" data-f="all">ทั้งหมด</button><button data-f="pass">ผ่าน</button><button data-f="fail">ล้ม</button></div>
<div class="chips">${rows.map(r => `<a class="${r.ok ? 'ok' : 'ng'}" href="#${r.id}">${esc(r.id)}</a>`).join('')}</div>
<div class="grid">${cards}</div>
<script>document.querySelectorAll('.f button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.f button').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('.card').forEach(c=>c.style.display=(b.dataset.f==='all'||c.dataset.st===b.dataset.f)?'':'none')})</script>
</body></html>`;
fs.writeFileSync('test-report/index.html', html);
console.log(`index.html: ${rows.length} test cases · ผ่าน ${pass} · ล้ม ${fail}`);

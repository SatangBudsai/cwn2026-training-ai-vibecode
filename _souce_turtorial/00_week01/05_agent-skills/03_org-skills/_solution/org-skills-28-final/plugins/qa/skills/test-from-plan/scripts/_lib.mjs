// ฟังก์ชันใช้ร่วมกันของสคริปต์ใน skill test-from-plan — ทุกสคริปต์รันโดย cwd = โฟลเดอร์ e2e
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

export const E2E = process.cwd();
export const arg = (name, def) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : def; };

export function loadPlan() {
  const f = path.join(E2E, 'plan.json');
  if (!fs.existsSync(f)) throw new Error('ไม่พบ e2e/plan.json — รัน parse-plan.mjs ก่อน');
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

/** โหลด @playwright/test จาก node_modules ของ e2e (สคริปต์อยู่ใน skill ไม่มี node_modules ของตัวเอง) */
export function playwright() {
  return createRequire(path.join(E2E, 'package.json'))('@playwright/test');
}

/** อ่านผลรันล่าสุด test-report/results.json → Map(id → {status, ok, duration, error, video, screenshot, file, title}) */
export function loadResults(plan, file = 'test-report/results.json') {
  const results = JSON.parse(fs.readFileSync(path.join(E2E, file), 'utf8'));
  const ids = new Set(plan.cases.map(c => c.id));
  const byId = new Map();
  const extra = [];
  const walk = s => {
    for (const x of s.suites ?? []) walk(x);
    for (const sp of s.specs ?? []) {
      // หา ID ที่ยาวที่สุดที่อยู่ในชื่อ test (กัน TC-A-1 ชนกับ TC-A-10)
      const id = [...ids].filter(i => new RegExp(`(^|[^A-Z0-9-])${i.replace(/[-]/g, '\\-')}(?![0-9])`).test(sp.title)).sort((a, b) => b.length - a.length)[0];
      for (const t of sp.tests) {
        const r = t.results.at(-1);
        const att = n => r?.attachments?.find(a => a.name === n)?.path;
        const row = {
          id, title: sp.title, file: sp.file, status: r?.status ?? 'missing', ok: r?.status === 'passed',
          duration: r?.duration, error: (r?.error?.message ?? '').replace(/\u001b\[[0-9;]*m/g, ''),
          video: att('video'), screenshot: att('screenshot'),
        };
        if (id && !byId.has(id)) byId.set(id, row); else extra.push(row);
      }
    }
  };
  results.suites.forEach(walk);
  return { results, byId, extra };
}

export function gifSeconds(f) {
  if (!fs.existsSync(f)) return 0;
  try { return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()); }
  catch { return 0; }
}

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const fileUrl = f => 'file:///' + path.resolve(f).split(path.sep).join('/');

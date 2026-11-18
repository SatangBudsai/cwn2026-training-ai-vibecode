#!/usr/bin/env node
/**
 * เทียบผลรอบปกติ (report-normal/) กับรอบฝังบั๊ก (test-report/) ทีละ test
 * เขียน test-report/compare.json ให้ build-report.mjs ใช้ และพิมพ์สรุปออกจอ
 *
 * กลุ่ม: ล้มใหม่ · หายล้ม · ล้มทั้งสอง · ผ่านทั้งสอง
 * ค่าจริงที่เปลี่ยน: เทียบ actual ของแต่ละจุดตรวจตามลำดับชื่อจุดตรวจ และ error หลังตัดค่าที่เปลี่ยนทุกรอบ
 * (รหัสจอง UUID เวลา ระยะเวลา) ออกแล้ว
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const NOW = path.join(ROOT, 'test-report');
const NORMAL = path.join(ROOT, 'report-normal', 'test-report');
const PROJECTS = ['chromium', 'mobile-chrome'];

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

/** ตัดค่าที่ต่างกันทุกรอบแม้เว็บเหมือนเดิม */
function normalize(s) {
  return String(s ?? '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/\bSJ[A-Z0-9]{6,}\b/g, '<code>')
    .replace(/\bGIFT-[A-Z0-9]{6,}\b/g, '<gift>')
    .replace(/localhost:\d+/g, 'localhost')
    .replace(/\b\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:\d{2})?/g, '<iso>')
    .replace(/\b\d+(\.\d+)?m?s\b/g, '<ms>')
    .replace(/\s+/g, ' ')
    .trim();
}

function load(base, project) {
  const dir = path.join(base, 'results', project);
  const out = new Map();
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    const r = readJson(path.join(dir, f));
    if (!r) continue;
    const ev = readJson(path.join(base, 'evidence', project, f)) ?? { checks: [] };
    out.set(r.id, { ...r, checks: ev.checks ?? [] });
  }
  return out;
}

/** จับคู่จุดตรวจตามชื่อ (ชื่อซ้ำจับตามลำดับ) แล้วคืนรายการที่ค่าจริงหรือผลตรวจเปลี่ยน */
function diffChecks(a, b) {
  const key = (c, seen) => { const k = normalize(c.label); const n = (seen[k] = (seen[k] ?? 0) + 1); return `${k}#${n}`; };
  const seenA = {}, seenB = {};
  const mapB = new Map(b.map((c) => [key(c, seenB), c]));
  const diffs = [];
  const used = new Set();
  for (const ca of a) {
    const k = key(ca, seenA);
    const cb = mapB.get(k);
    used.add(k);
    if (!cb) { diffs.push({ label: ca.label, normal: ca.actual, normalPass: ca.pass, bug: '(ไม่ถึงจุดตรวจนี้)', bugPass: null }); continue; }
    if (normalize(ca.actual) !== normalize(cb.actual) || ca.pass !== cb.pass) {
      diffs.push({ label: ca.label, normal: ca.actual, normalPass: ca.pass, bug: cb.actual, bugPass: cb.pass, shot: cb.shot, normalShot: ca.shot });
    }
  }
  for (const [k, cb] of mapB) if (!used.has(k)) diffs.push({ label: cb.label, normal: '(ไม่มีจุดตรวจนี้)', normalPass: null, bug: cb.actual, bugPass: cb.pass, shot: cb.shot });
  return diffs;
}

const rows = [];
for (const project of PROJECTS) {
  const normal = load(NORMAL, project);
  const bug = load(NOW, project);
  for (const id of [...new Set([...normal.keys(), ...bug.keys()])].sort()) {
    const n = normal.get(id), b = bug.get(id);
    const nPass = n?.status === 'passed', bPass = b?.status === 'passed';
    const group = !b ? 'ไม่ได้รันรอบฝังบั๊ก' : !n ? 'ไม่มีรอบปกติ' : nPass && !bPass ? 'ล้มใหม่' : !nPass && bPass ? 'หายล้ม' : !nPass ? 'ล้มทั้งสอง' : 'ผ่านทั้งสอง';
    const checkDiffs = n && b ? diffChecks(n.checks, b.checks) : [];
    const errN = (n?.errors ?? []).map(normalize).join('\n');
    const errB = (b?.errors ?? []).map(normalize).join('\n');
    rows.push({
      id, project, group,
      normalStatus: n?.status ?? null,
      bugStatus: b?.status ?? null,
      failedChecksNormal: n?.checks.filter((c) => !c.pass).length ?? 0,
      failedChecksBug: b?.checks.filter((c) => !c.pass).length ?? 0,
      errorChanged: Boolean(n && b && errN !== errB),
      checkDiffs,
      valueChanged: Boolean(n && b && (errN !== errB || checkDiffs.length > 0)),
    });
  }
}

fs.mkdirSync(NOW, { recursive: true });
fs.writeFileSync(path.join(NOW, 'compare.json'), JSON.stringify(rows, null, 2));

const count = {};
for (const r of rows) count[r.group] = (count[r.group] ?? 0) + 1;
console.log(count);
for (const g of ['ล้มใหม่', 'หายล้ม', 'ล้มทั้งสอง', 'ผ่านทั้งสอง']) {
  const list = rows.filter((r) => r.group === g && (g === 'ล้มใหม่' || g === 'หายล้ม' || r.valueChanged));
  console.log(`\n== ${g}${g === 'ล้มทั้งสอง' || g === 'ผ่านทั้งสอง' ? ' (เฉพาะที่ค่าจริงเปลี่ยน)' : ''}: ${list.length}`);
  for (const r of list) console.log(`${r.id} ${r.bugStatus} · จุดตรวจล้ม ${r.failedChecksNormal}→${r.failedChecksBug} · จุดที่ต่าง ${r.checkDiffs.length}${r.errorChanged ? ' · error เปลี่ยน' : ''}`);
}

#!/usr/bin/env node
/**
 * จัดการเว็บชุดเพิ่มและรันชุดทดสอบแบบขนาน (1 ชุด = 1 หัวข้อย่อย + เว็บของตัวเอง 1 คู่)
 *
 *   node scripts/run-suites.mjs up 1 2 3 4        เปิด sabai-web-N / sabai-db-N แล้วรอ /api/health
 *   node scripts/run-suites.mjs run 1 2 3 4       รัน chromium แล้วตามด้วย mobile-chrome ของแต่ละชุด
 *   node scripts/run-suites.mjs rerun <N> <ID..>  รันซ้ำเฉพาะข้อ ทั้งสอง project ที่ข้อนั้นอยู่
 *   ใส่ --chromium-only กับ run หรือ rerun เพื่อข้าม mobile-chrome
 *   node scripts/run-suites.mjs stats <ป้าย>     จด docker stats 1 ครั้ง + CPU/RAM เครื่อง ลง test-report/load-stats.json
 *   node scripts/run-suites.mjs down              ลบเว็บชุดเพิ่มทั้งหมด เหลือ sabai-web และ sabai-db เดิม
 */
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const REPORT = path.join(ROOT, 'test-report');
const REPO = path.resolve(ROOT, '..');
const SPECS = { 1: '5.1-', 2: '5.2-', 3: '5.3-', 4: '5.4-', 5: '5.5-', 6: '5.6-', 7: '5.7-', 8: '5.8-' };
const MOBILE_SUITES = new Set(['1', '8']);

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const portOf = (n) => 3100 + Number(n) * 10;

function imageOfWeb() {
  return sh('docker', ['inspect', 'sabai-web', '--format', '{{.Config.Image}}']);
}

/** ค่า env ของ sabai-web ที่ตั้งเอง ไม่นับค่าจาก image เช่น PATH */
function webEnv() {
  const env = JSON.parse(sh('docker', ['inspect', 'sabai-web', '--format', '{{json .Config.Env}}']));
  const keep = /^(SESSION_SECRET|TZ|FEATURE_SKIN_PREVIEW|HOSTNAME|BUG_MODE|PORT)=/;
  return env.filter((e) => keep.test(e));
}

function up(n) {
  const db = `sabai-db-${n}`;
  const web = `sabai-web-${n}`;
  const init = path.join(REPO, 'db', 'init').replace(/\\/g, '/');
  sh('docker', ['run', '-d', '--name', db, '--network', 'sabai-net',
    '-e', 'POSTGRES_USER=sabai', '-e', 'POSTGRES_PASSWORD=sabai', '-e', 'POSTGRES_DB=sabai',
    '-e', 'TZ=Asia/Bangkok', '-e', 'PGTZ=Asia/Bangkok', '-e', 'PGCLIENTENCODING=UTF8',
    '-v', `${init}:/docker-entrypoint-initdb.d:ro`, 'postgres:16-alpine']);
  const envArgs = webEnv().flatMap((e) => ['-e', e]);
  sh('docker', ['run', '-d', '--name', web, '--network', 'sabai-net', '-p', `${portOf(n)}:3000`,
    ...envArgs,
    '-e', 'ALLOW_TEST_RESET=1',
    '-e', `DATABASE_URL=postgres://sabai:sabai@${db}:5432/sabai`,
    imageOfWeb()]);
}

async function waitHealth(n, timeoutMs = 180_000) {
  const url = `http://localhost:${portOf(n)}/api/health`;
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const r = await fetch(url);
      const b = await r.json();
      if (b.ok === true && b.db === true) return;
    } catch { /* ยังไม่พร้อม */ }
    await sleep(1000);
  }
  throw new Error(`ชุด ${n}: ${url} ไม่ตอบ ok ภายในเวลา`);
}

function runPlaywright(n, project, extraArgs) {
  const logDir = path.join(REPORT, 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const log = fs.createWriteStream(path.join(logDir, `5.${n}-${project}.log`), { flags: 'a' });
  return new Promise((resolve) => {
    const child = spawn('npx', ['playwright', 'test', ...extraArgs, `--project=${project}`], {
      cwd: ROOT,
      shell: true,
      env: { ...process.env, BASE_URL: `http://localhost:${portOf(n)}`, SUITE: `5.${n}-${project}` },
    });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    child.on('close', (code) => { log.end(); resolve(code); });
  });
}

function resultsOf(project, specPrefix) {
  const dir = path.join(REPORT, 'results', project);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter((r) => r.file.startsWith(specPrefix));
}

async function runProject(n, project) {
  const spec = SPECS[n];
  const started = Date.now();
  await runPlaywright(n, project, [`tests/${spec}`]);
  // ข้อที่ timeout รันซ้ำ 1 ครั้ง
  const timedOut = resultsOf(project, spec).filter((r) => r.status === 'timedOut').map((r) => r.id);
  if (timedOut.length) {
    console.log(`ชุด ${n} ${project}: timeout ${timedOut.join(', ')} รันซ้ำ 1 ครั้ง`);
    await runPlaywright(n, project, [`tests/${spec}`, '--grep', `"${timedOut.map((id) => `${id} `).join('|')}"`]);
  }
  const rs = resultsOf(project, spec);
  const passed = rs.filter((r) => r.status === 'passed').length;
  console.log(`ชุด ${n} ${project}: ผ่าน ${passed}/${rs.length} · ${Math.round((Date.now() - started) / 1000)} วิ`);
}

async function runSuite(n) {
  await runProject(n, 'chromium');
  // mobile-chrome รันหลัง chromium ของชุดนั้นจบ
  if (!CHROMIUM_ONLY && MOBILE_SUITES.has(String(n))) await runProject(n, 'mobile-chrome');
}

function stats(label) {
  const raw = sh('docker', ['stats', '--no-stream', '--format', '{{json .}}']);
  const rows = raw.split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => /^sabai-(web|db)-\d$/.test(r.Name));
  const toMiB = (s) => {
    const m = /([\d.]+)\s*([KMG]i?B)/.exec(s.split('/')[0]);
    if (!m) return 0;
    return Number(m[1]) * ({ KiB: 1 / 1024, MiB: 1, GiB: 1024, KB: 1 / 1024, MB: 1, GB: 1024 }[m[2]] ?? 1);
  };
  const cpu = rows.reduce((a, r) => a + parseFloat(r.CPUPerc), 0);
  const mem = rows.reduce((a, r) => a + toMiB(r.MemUsage), 0);
  const entry = {
    label,
    at: new Date().toISOString(),
    containers: rows.length,
    containerCpuPercent: Math.round(cpu * 10) / 10,
    containerMemMiB: Math.round(mem),
    hostLogicalCpus: os.cpus().length,
    hostLoadedMemGiB: Math.round(((os.totalmem() - os.freemem()) / 1024 ** 3) * 10) / 10,
    hostTotalMemGiB: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
    rows: rows.map((r) => ({ name: r.Name, cpu: r.CPUPerc, mem: r.MemUsage })),
  };
  const file = path.join(REPORT, 'load-stats.json');
  fs.mkdirSync(REPORT, { recursive: true });
  const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  all.push(entry);
  fs.writeFileSync(file, JSON.stringify(all, null, 2));
  console.log(JSON.stringify({ ...entry, rows: undefined }));
}

function down() {
  const names = sh('docker', ['ps', '-a', '--format', '{{.Names}}']).split('\n').filter((x) => /^sabai-(web|db)-\d$/.test(x));
  if (names.length) sh('docker', ['rm', '-f', '-v', ...names]);
  console.log('ลบแล้ว:', names.join(', ') || '(ไม่มี)');
}

const argv = process.argv.slice(2);
const CHROMIUM_ONLY = argv.includes('--chromium-only');
const [cmd, ...args] = argv.filter((a) => a !== '--chromium-only');
switch (cmd) {
  case 'up':
    for (const n of args) up(n);
    await Promise.all(args.map((n) => waitHealth(n)));
    console.log('พร้อมทุกชุด:', args.map((n) => portOf(n)).join(', '));
    break;
  case 'run':
    await Promise.all(args.map((n) => runSuite(n)));
    break;
  case 'rerun': {
    const [n, ...ids] = args;
    const grep = `"${ids.map((id) => `${id} `).join('|')}"`;
    await runPlaywright(n, 'chromium', [`tests/${SPECS[n]}`, '--grep', grep]);
    if (!CHROMIUM_ONLY && MOBILE_SUITES.has(String(n))) await runPlaywright(n, 'mobile-chrome', [`tests/${SPECS[n]}`, '--grep', grep]);
    break;
  }
  case 'stats':
    stats(args.join(' ') || 'snapshot');
    break;
  case 'down':
    down();
    break;
  default:
    console.error('ใช้: up|run|rerun|stats|down');
    process.exit(1);
}

#!/usr/bin/env node
// สร้างโครงโปรเจกต์ สมาชิก + ชำระเงิน จาก templates/ ของ skill
// ใช้: node scaffold.mjs --config scaffold.json --out <โฟลเดอร์ใหม่> [--force]
// scaffold.json: { name, title, client, consentVersion, packages: [{ id, description, amountSatang }], todos: [string] }
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATES = join(SKILL_DIR, 'templates');
const TEXT_EXT = /\.(ts|tsx|mjs|js|json|md|prisma|example)$|(^|[\\/])(gitignore|env\.example)$/;

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function die(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

const configPath = arg('config');
const out = arg('out');
if (!configPath || !out) die('ต้องระบุ --config <scaffold.json> และ --out <โฟลเดอร์>');

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const { name, title, client = '-', consentVersion = '1.0', packages = [], todos = [] } = config;

if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name ?? '')) die('name ต้องเป็น kebab-case เช่น sukjai-spa (arch-standards ข้อ 7)');
if (!title) die('ต้องมี title');
if (!Array.isArray(packages) || packages.length === 0) die('ต้องมี packages อย่างน้อย 1 รายการ');
for (const p of packages) {
  if (!p.id || !p.description || !Number.isInteger(p.amountSatang) || p.amountSatang <= 0) {
    die(`package ไม่ครบ/ราคาไม่ใช่จำนวนเต็มสตางค์: ${JSON.stringify(p)}`);
  }
}

const target = resolve(out);
if (existsSync(target) && readdirSync(target).length > 0 && !process.argv.includes('--force')) {
  die(`${target} มีไฟล์อยู่แล้ว — ไม่เขียนทับ (ใช้ --force ถ้าตั้งใจ)`);
}

const tokens = {
  __PROJECT_TITLE__: title,
  __DB_PROJECT__: name.replace(/-/g, ''),
  __CONSENT_VERSION__: consentVersion,
  __PACKAGES__: JSON.stringify(packages, null, 2),
  __CLIENT__: client,
  __DATE__: new Date().toISOString().slice(0, 10),
  __TODOS__: todos.length ? todos.map((t) => `- [ ] ${t}`).join('\n') : '- [ ] (ไม่มี)',
  __PROJECT__: name,
};

mkdirSync(target, { recursive: true });
cpSync(TEMPLATES, target, { recursive: true });

// ชื่อไฟล์ที่ขึ้นต้นด้วยจุดเก็บใน template แบบไม่มีจุด (กัน tool บางตัวข้ามไฟล์ซ่อน)
renameSync(join(target, 'gitignore'), join(target, '.gitignore'));
renameSync(join(target, 'env.example'), join(target, '.env.example'));

// แทน placeholder เฉพาะไฟล์ที่มาจาก templates/ เท่านั้น (ห้ามแตะ node_modules/.env ที่มีอยู่เดิมตอน --force)
function listTemplateFiles(dir, prefix = '') {
  return readdirSync(dir).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry}` : entry;
    return statSync(join(dir, entry)).isDirectory() ? listTemplateFiles(join(dir, entry), rel) : [rel];
  });
}
const RENAMED = { gitignore: '.gitignore', 'env.example': '.env.example' };
const copied = listTemplateFiles(TEMPLATES).map((rel) => RENAMED[rel] ?? rel);
for (const rel of copied) {
  if (!TEXT_EXT.test(rel) && !rel.startsWith('.')) continue;
  const full = join(target, rel);
  let text = readFileSync(full, 'utf8');
  for (const [token, value] of Object.entries(tokens)) text = text.split(token).join(value);
  writeFileSync(full, text);
}
const count = copied.length;

console.log(`✅ สร้าง ${name} (${count} ไฟล์) ที่ ${target}`);
console.log(`   ต่อไป: node ${join(SKILL_DIR, 'scripts', 'check.mjs')} ${target}`);

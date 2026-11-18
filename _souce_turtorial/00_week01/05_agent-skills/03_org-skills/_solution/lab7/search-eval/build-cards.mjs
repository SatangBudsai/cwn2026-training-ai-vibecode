// build-cards.mjs — อ่านทุก SKILL.md ใน repo/plugins → cards-header.json + cards-full.json (Node 22, ไม่ใช้ npm package)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PLUGINS = join(HERE, 'repo', 'plugins');

// --- YAML frontmatter แบบย่อ: scalar, "quoted", block | / >, list [a, b], map ซ้อน (indent) ---
function parseScalar(v) {
  v = v.trim();
  if (v === '' ) return '';
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    return inner ? inner.split(',').map(s => parseScalar(s)) : [];
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}
export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: text };
  const lines = m[1].split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, obj: root }];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.match(/^ */)[0].length;
    const kv = line.trim().match(/^([\w.-]+):\s*(.*)$/);
    if (!kv) continue;
    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const parent = stack.at(-1).obj;
    const [, key, rest] = kv;
    if (rest === '|' || rest === '>' || rest === '|-' || rest === '>-') {
      const buf = [];
      while (i + 1 < lines.length && (lines[i + 1].trim() === '' || lines[i + 1].match(/^ */)[0].length > indent)) buf.push(lines[++i].trim());
      parent[key] = rest.startsWith('|') ? buf.join('\n').trim() : buf.join(' ').trim();
    } else if (rest === '') {
      // map ซ้อน หรือ list แบบ "- x"
      if (i + 1 < lines.length && lines[i + 1].trim().startsWith('- ')) {
        const arr = [];
        while (i + 1 < lines.length && lines[i + 1].trim().startsWith('- ')) arr.push(parseScalar(lines[++i].trim().slice(2)));
        parent[key] = arr;
      } else {
        parent[key] = {};
        stack.push({ indent, obj: parent[key] });
      }
    } else parent[key] = parseScalar(rest);
  }
  return { meta: root, body: text.slice(m[0].length) };
}

// --- สรุปแบบดึงจากเนื้อหา: หัวข้อ ## ทุกหัวข้อ + ประโยคแรกของหัวข้อนั้น (ไม่ใช้ AI) ---
function firstSentence(lines) {
  let inFence = false;
  for (let raw of lines) {
    const l = raw.trim();
    if (l.startsWith('```')) { inFence = !inFence; continue; }
    if (inFence || !l || l.startsWith('|') || l.startsWith('#') || /^-{3,}$/.test(l)) continue;
    let s = l.replace(/^([-*]|\d+\.)\s+(\[.\]\s*)?/, '')      // bullet / เลขข้อ / checkbox
             .replace(/\*\*|__|`/g, '')                       // markdown emphasis/code
             .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');         // link
    const cut = s.search(/(?<=[.!?])\s|(?<=[。])/);           // ประโยคแรก (ภาษาไทยไม่มีจุด → ทั้งบรรทัด)
    if (cut > 0) s = s.slice(0, cut);
    return s.trim();
  }
  return '';
}
export function extractSummary(body, max = 600) {
  const lines = body.split(/\r?\n/);
  const parts = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('```')) { inFence = !inFence; continue; }
    if (inFence) continue;
    const h = lines[i].match(/^##\s+(.+?)\s*$/);
    if (!h) continue;
    let j = i + 1;
    while (j < lines.length && !/^#{1,2}\s/.test(lines[j])) j++;
    const sent = firstSentence(lines.slice(i + 1, j));
    parts.push(sent ? `${h[1]}: ${sent}` : h[1]);
  }
  let out = parts.join(' | ');
  if (out.length > max) out = out.slice(0, max - 1) + '…';
  return out;
}

export function buildCards() {
  const header = [], full = [];
  for (const plugin of readdirSync(PLUGINS).sort()) {
    const sdir = join(PLUGINS, plugin, 'skills');
    if (!existsSync(sdir)) continue;
    for (const skill of readdirSync(sdir).sort()) {
      const f = join(sdir, skill, 'SKILL.md');
      if (!existsSync(f)) continue;
      const { meta, body } = parseFrontmatter(readFileSync(f, 'utf8'));
      const md = meta.metadata || {};
      const card = {
        name: meta.name || skill,
        plugin: md.plugin || plugin,
        description: meta.description || '',
        metadata: {
          owner: md.owner ?? null, layer: md.layer ?? null, version: md.version ?? null,
          uses: md.uses || [], next: md.next || [], follows: md.follows || [],
        },
      };
      header.push(card);
      full.push({ ...card, summary: extractSummary(body) });
    }
  }
  return { header, full };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { header, full } = buildCards();
  writeFileSync(join(HERE, 'cards-header.json'), JSON.stringify(header, null, 2));
  writeFileSync(join(HERE, 'cards-full.json'), JSON.stringify(full, null, 2));
  console.log(`cards: ${header.length} skills จาก ${new Set(header.map(c => c.plugin)).size} plugins → cards-header.json, cards-full.json`);
  const longest = Math.max(...full.map(c => c.summary.length));
  console.log(`summary ยาวสุด ${longest} ตัวอักษร`);
}

// graph.mjs — cards-header.json → graph.json + impact analysis
// ใช้: node graph.mjs              (สร้าง graph.json)
//      node graph.mjs impact <skill>  (ถ้าแก้ skill นี้กระทบใคร)
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEP_TYPES = ['uses', 'follows'];   // เส้นที่ "ต้องใช้คู่กัน" / ได้รับผลเมื่อปลายทางเปลี่ยน

export function buildGraph(cards) {
  const nodes = [], edges = [], seen = new Set();
  const names = new Set(cards.map(c => c.name));
  const addNode = (n) => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };
  for (const c of cards) addNode({ id: `skill:${c.name}`, type: 'skill', name: c.name, plugin: c.plugin, layer: c.metadata.layer });
  for (const c of cards) {
    const m = c.metadata;
    for (const t of ['uses', 'next', 'follows']) for (const to of m[t] || []) {
      edges.push({ from: `skill:${c.name}`, to: `skill:${to}`, type: t, ...(names.has(to) ? {} : { missing: true }) });
    }
    if (m.owner) {
      addNode({ id: `person:${m.owner}`, type: 'owner', name: m.owner });
      edges.push({ from: `skill:${c.name}`, to: `person:${m.owner}`, type: 'owned_by' });
    }
  }
  return { nodes, edges };
}

/** skill ที่ต้องใช้คู่กับ name (uses/follows) — ทางตรง+ทางอ้อม */
export function companions(cards, name) {
  const by = new Map(cards.map(c => [c.name, c]));
  const out = [], seen = new Set([name]), q = [name];
  while (q.length) {
    const cur = by.get(q.shift()); if (!cur) continue;
    for (const t of DEP_TYPES) for (const d of cur.metadata[t] || []) if (!seen.has(d)) { seen.add(d); out.push(d); q.push(d); }
  }
  return out;
}

/** ถ้าแก้ skill X กระทบใคร: ทุก skill ที่มี uses/follows ชี้มาที่ X ทางตรงและทางอ้อม + เจ้าของ */
export function impact(graph, x) {
  const target = `skill:${x}`;
  if (!graph.nodes.some(n => n.id === target)) throw new Error(`ไม่มี skill ชื่อ ${x}`);
  const rev = new Map();
  for (const e of graph.edges) if (DEP_TYPES.includes(e.type)) {
    if (!rev.has(e.to)) rev.set(e.to, []);
    rev.get(e.to).push(e);
  }
  const owner = id => graph.edges.find(e => e.from === id && e.type === 'owned_by')?.to.slice(7) ?? null;
  const affected = [], seen = new Set([target]);
  let frontier = [{ id: target, path: [x] }];
  for (let depth = 1; frontier.length; depth++) {
    const next = [];
    for (const f of frontier) for (const e of rev.get(f.id) || []) {
      if (seen.has(e.from)) continue;
      seen.add(e.from);
      const name = e.from.slice(6), path = [name, ...f.path];
      affected.push({ skill: name, owner: owner(e.from), depth, via: e.type, path: path.join(' → ') });
      next.push({ id: e.from, path });
    }
    frontier = next;
  }
  const owners = [...new Set(affected.map(a => a.owner).filter(Boolean))].sort();
  return { skill: x, owner: owner(target), direct: affected.filter(a => a.depth === 1).length,
           indirect: affected.filter(a => a.depth > 1).length, affected, owners };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const cards = JSON.parse(readFileSync(join(HERE, 'cards-header.json'), 'utf8'));
  const graph = buildGraph(cards);
  writeFileSync(join(HERE, 'graph.json'), JSON.stringify(graph, null, 2));
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'impact') {
    const r = impact(graph, arg);
    console.log(`แก้ ${r.skill} (owner ${r.owner}) กระทบ ${r.affected.length} skill (ตรง ${r.direct}, อ้อม ${r.indirect}) · เจ้าของ ${r.owners.length} คน`);
    for (const a of r.affected) console.log(`  [${a.depth}] ${a.skill.padEnd(20)} owner=${String(a.owner).padEnd(11)} via ${a.via.padEnd(7)} ${a.path}`);
    console.log(`ต้องแจ้ง: ${r.owners.join(', ') || '-'}`);
  } else {
    const t = {}; for (const e of graph.edges) t[e.type] = (t[e.type] || 0) + 1;
    console.log(`graph.json: ${graph.nodes.length} nodes, ${graph.edges.length} edges`, t);
  }
}

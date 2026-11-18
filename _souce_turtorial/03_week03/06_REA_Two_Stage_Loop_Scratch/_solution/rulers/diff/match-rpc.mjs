// node diff/match-rpc.mjs → สำหรับแต่ละสถานการณ์ในเฉลย หา response GetShoppingResults (diff/live) ที่ถอดแล้ว "ราคา|เวลาออก|แวะพัก" ตรงกับจอทั้งรายการและลำดับ
// ใช้ยืนยันว่าเฉลยบนจอ = ข้อมูลเครือข่ายของรอบเดียวกัน และบอกว่าแต่ละสถานการณ์ต้องใช้ข้อมูลชุดไหน → diff/live/scenario-sources.json
import fs from 'node:fs';
const D = new URL('.', import.meta.url).pathname;
const S = JSON.parse(fs.readFileSync(D + 'expected.json', 'utf8')).scenarios;
const hh = (t) => t ? `${String(t[0] || 0).padStart(2, '0')}:${String(t[1] || 0).padStart(2, '0')}` : null;
const P = [];
for (const f of fs.readdirSync(D + 'live').filter(f => /^rpc-.*\.txt$/.test(f)).sort()) {
  const txt = fs.readFileSync(D + 'live/' + f, 'utf8');
  for (const line of txt.split('\n')) { if (!line.startsWith('[[')) continue;
    try { for (const v of JSON.parse(line)) if (v[0] === 'wrb.fr' && v[2]) { const a = JSON.parse(v[2]); if (!Array.isArray(a?.[2]?.[0])) continue;
      const rows = [...a[2][0], ...(a[3]?.[0] || [])];
      P.push({ file: f, at: txt.slice(2, 21), sig: rows.map(r => `${r[1]?.[0]?.[1]}|${hh(r[0][5])}|${r[0][2].length - 1}`) }); } } catch {} }
}
const out = {};
for (const [id, s] of Object.entries(S)) {
  if (!s.prices) continue;
  const scr = s.prices.map((p, i) => `${p}|${s.deps[i]}|${s.stops[i]}`);
  const hit = P.filter(p => JSON.stringify(p.sig) === JSON.stringify(scr));
  out[id] = { screenRows: scr.length, exactMatch: hit.map(h => `${h.file} (${h.at})`) };
}
fs.writeFileSync(D + 'live/scenario-sources.json', JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(16), v.screenRows, v.exactMatch.length ? '✓ ' + v.exactMatch.slice(-1)[0] : '✗ ไม่มี response ที่ตรงทั้งลำดับ');

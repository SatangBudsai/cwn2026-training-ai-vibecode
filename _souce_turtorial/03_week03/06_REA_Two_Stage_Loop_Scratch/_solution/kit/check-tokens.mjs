// node kit/check-tokens.mjs [tokens.css] — ตรวจ tokens.css: contrast ≥ 4.5:1 ของคู่ข้อความ/พื้น · ตัวอักษร ≥ 14px · จำนวนตัวแปร
import fs from 'node:fs';
const f = process.argv[2] || new URL('../app/src/styles/tokens.css', import.meta.url).pathname;
const css = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const v = {}; for (const m of css.matchAll(/(--[\w-]+):\s*([^;]+);/g)) v[m[1]] = m[2].trim();
const res = n => { let x = v[n]; while (/^var\(/.test(x)) x = v[x.match(/var\((--[\w-]+)\)/)[1]]; return x; };
const L = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const cr = (a, b) => { const x = L(res(a)), y = L(res(b)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const pairs = [['--color-text', '--color-bg'], ['--color-text', '--color-bg-subtle'], ['--color-text', '--color-bg-selected'],
  ['--color-text-secondary', '--color-bg'], ['--color-text-secondary', '--color-bg-subtle'], ['--color-primary', '--color-bg'],
  ['--form-search-color', '--form-search-bg'], ['--chip-color', '--color-bg'], ['--chip-selected-color', '--chip-selected-bg'],
  ['--tab-color', '--color-bg'], ['--tab-active-color', '--color-bg'], ['--price-color', '--color-bg'], ['--price-good-color', '--color-bg'],
  ['--color-warning', '--color-bg'], ['--more-color', '--page-bg'], ['--footer-color', '--page-bg'], ['--tool-button-color', '--color-bg']];
let ok = true;
for (const [a, b] of pairs) { const r = cr(a, b); ok &&= r >= 4.5; console.log(`${a} / ${b}: ${r.toFixed(2)}:1 ${r >= 4.5 ? 'OK' : 'FAIL'}`); }
const sizes = Object.keys(v).filter(k => /font-size|-(time|sub|price|title|heading|note|text|tab-price)-size$|^--(price|tab-price|list-heading|list-note|popover-title|insights-title|details-text|row-time|row-sub|price-note)-size$/.test(k)).map(k => [k, res(k)]);
const small = sizes.filter(([, x]) => parseFloat(x) < 14);
console.log(`ตัวแปรขนาดตัวอักษร ${sizes.length} ตัว · เล็กสุด ${Math.min(...sizes.map(s => parseFloat(s[1])))}px · ต่ำกว่า 14px: ${small.length ? JSON.stringify(small) : 'ไม่มี'}`);
console.log(`ตัวแปรทั้งหมด ${Object.keys(v).length} ตัว`);
process.exit(ok && !small.length ? 0 : 1);

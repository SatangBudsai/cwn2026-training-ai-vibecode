import { photo, esc } from './kit.mjs';
export const P = 'C:/t/spa04/sabai/brand-kit';
export const L = 'C:/t/spa04/lessonimg';
export const OUT = process.env.OUT || 'C:/t/spa04/out/img';
export const brand = (f) => photo(`${P}/${f}.jpg`);
export const lesson = (n) => photo(`${L}/${n}.jpg`);
export const port = (n, s = 96, d = 0, extra = '') => `<img class="port pop" style="--d:${d}s;width:${s}px;height:${s}px;${extra}" src="${brand('people/' + n)}">`;
export const bg = (url, shade = '') => `<div class="bg" style="background-image:url(${url})"></div><div class="shade ${shade}"></div>`;
export const head = (kick, title, sub = '') => `<div class="abs" style="left:48px;top:26px;right:48px"><div class="kick in">${kick}</div><h1 class="in" style="--d:.2s;font-size:40px">${title}</h1>${sub ? `<div class="sub in" style="--d:.5s;font-size:22px">${sub}</div>` : ''}</div>`;
export const foot = (text, d) => `<div class="abs in" style="--d:${d}s;left:48px;right:48px;bottom:22px;text-align:center"><span style="display:inline-block;background:rgba(201,162,75,.96);color:#17392b;font-weight:700;font-size:24px;padding:8px 26px;border-radius:14px">${text}</span></div>`;
// ลูกศรแนวนอน
export const arrow = (x, y, w, d, color = 'var(--gold2)', rev = false, t = .5) => `<div class="abs grow" style="--d:${d}s;--t:${t}s;left:${x}px;top:${y}px;width:${w}px;height:4px;background:${color};${rev ? 'transform-origin:100% 50%' : ''}"></div><div class="abs fade" style="--d:${d + t - .05}s;left:${rev ? x - 12 : x + w - 2}px;top:${y - 8}px;width:0;height:0;${rev ? `border-right:14px solid ${color}` : `border-left:14px solid ${color}`};border-top:10px solid transparent;border-bottom:10px solid transparent"></div>`;
export const varrow = (x, y, h, d, color = 'var(--gold2)', t = .4) => `<div class="abs growv" style="--d:${d}s;--t:${t}s;left:${x}px;top:${y}px;width:4px;height:${h}px;background:${color}"></div><div class="abs fade" style="--d:${d + t - .05}s;left:${x - 8}px;top:${y + h - 2}px;width:0;height:0;border-top:14px solid ${color};border-left:10px solid transparent;border-right:10px solid transparent"></div>`;
// sequence diagram: cols=[{name,x,color}] msgs=[{from,to,text,ret,note,t,color}]
export function sequence(cols, msgs, { top = 150, step = 44, start = 1, gap = 1 } = {}) {
  let h = '';
  cols.forEach((c, i) => {
    h += `<div class="abs in" style="--d:${.3 + i * .15}s;left:${c.x - 92}px;top:${top - 58}px;width:184px;text-align:center;background:${c.color || 'var(--leaf2)'};border:1.5px solid var(--gold);border-radius:12px;padding:7px 4px;font-weight:700;font-size:20px;line-height:1.2;color:#fff">${c.name}</div>`;
    h += `<div class="abs growv" style="--d:${.5 + i * .1}s;--t:.8s;left:${c.x - 1}px;top:${top - 6}px;width:2px;height:${step * msgs.length + 30}px;background:rgba(230,201,122,.45)"></div>`;
  });
  msgs.forEach((m, i) => {
    const d = m.t ?? start + i * gap, y = top + 18 + i * step;
    const a = cols[m.from].x, b = cols[m.to ?? m.from].x;
    if (m.from === (m.to ?? m.from)) {
      h += `<div class="abs pop" style="--d:${d}s;left:${a - 12}px;top:${y - 14}px;width:24px;height:24px;border-radius:50%;background:${m.color || 'var(--gold)'}"></div><div class="abs in" style="--d:${d + .1}s;left:${a + 20}px;top:${y - 18}px;font-size:20px;font-weight:600;background:rgba(13,31,23,.85);padding:1px 10px;border-radius:8px;color:${m.color || 'var(--gold2)'};white-space:nowrap">${m.text}</div>`;
    } else {
      const rev = b < a, x = Math.min(a, b), w = Math.abs(a - b);
      h += arrow(x + (rev ? 10 : 0), y, w - 10, d, m.color || (m.ret ? '#a9c9b5' : 'var(--gold2)'), rev, .35);
      h += `<div class="abs in" style="--d:${d + .15}s;left:${x + 6}px;width:${Math.max(w - 12, 150)}px;top:${y - 27}px;text-align:center;font-size:19px;font-weight:600;white-space:nowrap;color:${m.color || '#fff'}">${m.text}</div>`;
    }
  });
  return h;
}

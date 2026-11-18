// โหลดก่อนทุกตัววัด (node --import ./lib/hooks.mjs):
// 1) แทน frozen/open-original.mjs ด้วย stub ที่โยน error (runner/stub-frozen.mjs ตัวเดิม) → ไม่มีทางเปิดต้นฉบับ/ต่อ Google
// 2) ให้ import แบบ bare ('playwright', 'pixelmatch', 'pngjs') จากไฟล์ใน kit/src หาเจอใน kit/.tools/node_modules
//    (ไม่ต้องวาง node_modules ใน kit/src และไม่แตะไฟล์ใน kit/src)
import { register } from 'node:module';
import '../src/runner/stub-frozen.mjs';
const TOOLS = new URL('../.tools/package.json', import.meta.url).href;
register('data:text/javascript,' + encodeURIComponent(`
  const BARE = /^(playwright|playwright-core|pixelmatch|pngjs)(\\/|$)/;
  export async function resolve(specifier, context, next) {
    if (BARE.test(specifier)) return next(specifier, { ...context, parentURL: ${JSON.stringify(TOOLS)} });
    return next(specifier, context);
  }`));

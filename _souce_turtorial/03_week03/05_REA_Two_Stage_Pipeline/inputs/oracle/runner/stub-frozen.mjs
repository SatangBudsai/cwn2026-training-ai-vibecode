// diff/lib/original.mjs นำเข้า ../../frozen/open-original.mjs (ตัวเปิดต้นฉบับแช่แข็งที่ต้องใช้ HAR ของ Google)
// งานนี้ใช้เฉลยที่บันทึกไว้ใน diff/diff-results.json เท่านั้น จึงแทนโมดูลนั้นด้วยตัวว่างที่โยน error ถ้ามีใครเรียก
// (กันไม่ให้มีการเปิดต้นฉบับ/ต่อ Google โดยไม่ตั้งใจ) — ไม่แตะไฟล์ใน diff/ เลย
import { register } from 'node:module';

const STUB = 'data:text/javascript,' + encodeURIComponent(`
  const no = () => { throw new Error('frozen original disabled: ใช้เฉลยจาก diff/diff-results.json เท่านั้น'); };
  export const SEARCH_URL = 'about:blank';
  export const newFrozenContext = no;
`);
const hooks = `
  export async function resolve(specifier, context, next) {
    if (/frozen\\/open-original\\.mjs$/.test(specifier)) return { url: ${JSON.stringify(STUB)}, shortCircuit: true };
    return next(specifier, context);
  }`;
register('data:text/javascript,' + encodeURIComponent(hooks));

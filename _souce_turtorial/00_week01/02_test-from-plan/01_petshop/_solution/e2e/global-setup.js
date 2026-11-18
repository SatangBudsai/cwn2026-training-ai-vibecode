// ล้างข้อมูลครั้งเดียวก่อนรันทั้งชุด (TEST-PLAN §7) — รันขนานแล้ว reset ทุก test จะทับกันเอง
// ตั้ง NO_RESET=1 เพื่อข้าม (ใช้ตอน agent พัฒนา test พร้อมกันหลายตัว)
const { request } = require('@playwright/test');
module.exports = async () => {
  if (process.env.NO_RESET === '1') return;
  const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });
  const res = await ctx.post('/api/test/reset');
  if (!res.ok()) throw new Error(`reset failed: ${res.status()}`);
  await ctx.dispose();
};

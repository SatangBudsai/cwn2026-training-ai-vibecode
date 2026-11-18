const { request } = require("@playwright/test");
module.exports = async () => {            // ล้างข้อมูลผู้ใช้ คำสั่งซื้อ สต็อก ก่อนรันทั้งชุด
  const ctx = await request.newContext({ baseURL: process.env.BASE_URL });
  await ctx.post("/api/test/reset");
  await ctx.dispose();
};

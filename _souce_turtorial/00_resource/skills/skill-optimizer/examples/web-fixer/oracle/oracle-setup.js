const { request } = require("@playwright/test");
module.exports = async () => {
  const ctx = await request.newContext({ baseURL: process.env.BASE_URL || "http://127.0.0.1:3000" });
  const res = await ctx.post("/api/test/reset");
  if (!res.ok()) throw new Error("reset failed: " + res.status());
  await ctx.dispose();
};

const { test, expect } = require("@playwright/test");
const T = (id) => `[data-testid="${id}"]`;
test.beforeEach(async ({ request }) => { await request.post("/api/test/reset"); });
const shot = (page, tc) => page.screenshot({ path: `${__dirname}/../evidence/${tc}.png` });

test("TC-CPN-01 PAW10 ฿799 ลด ฿79 → ฿770", async ({ page }) => {
  await page.goto("/products/adult-chicken-dry"); await page.waitForSelector("html[data-ready=true]");
  await page.locator(`${T("size-option")}[data-size="3 kg"]`).click();
  await page.click(T("add-to-cart")); await expect(page.locator(T("cart-count"))).toHaveText("1");
  await page.goto("/cart");
  await page.fill(T("coupon-input"), "PAW10"); await page.click(T("coupon-apply"));
  await expect(page.locator(T("summary-discount"))).toHaveText("-฿79");
  await expect(page.locator(T("summary-total"))).toHaveText("฿770");
  await shot(page, "TC-CPN-01");
});

test("TC-PRD-03 จำนวนเกินสต็อกหยุดที่ 3", async ({ page }) => {
  await page.goto("/products/hairball-control-dry"); await page.waitForSelector("html[data-ready=true]");
  for (let i = 0; i < 5; i++) await page.click(T("qty-plus"));
  await expect(page.locator(T("qty-input"))).toHaveValue("3");
  await page.click(T("add-to-cart"));
  await expect(page.locator(T("cart-count"))).toHaveText("3");
  await shot(page, "TC-PRD-03");
});

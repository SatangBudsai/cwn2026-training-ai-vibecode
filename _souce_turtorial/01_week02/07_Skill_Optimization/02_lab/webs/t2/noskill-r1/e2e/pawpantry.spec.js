const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

test("TC-CAT-03 เรียงราคาน้อย → มาก เริ่มที่ ฿35", async ({ page }) => {
  await page.goto("/products");
  await page.locator('html[data-ready="true"]').waitFor();
  await page.getByTestId("sort-select").selectOption("price-asc");
  await page.waitForURL(/sort=price-asc/);
  const texts = await page.getByTestId("product-price").allInnerTexts();
  const prices = texts.map((t) => Number(t.replace(/[^\d]/g, "")));
  expect(prices[0]).toBe(35);
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
});

test("TC-CART-03 ส่งฟรีเมื่อครบ ฿999 ข้อความความคืบหน้าไม่ติดลบ", async ({ page }) => {
  await page.goto("/products/adult-lamb-dry");
  await page.locator('html[data-ready="true"]').waitFor();
  await page.getByTestId("add-to-cart").click();
  await page.goto("/cart");
  await page.locator('html[data-ready="true"]').waitFor();
  await expect(page.getByTestId("summary-shipping")).toHaveText("฿50");
  await expect(page.getByTestId("free-shipping-progress")).toContainText("฿209");
  for (let i = 0; i < 2; i++) await page.getByTestId("item-plus").click();
  await expect(page.getByTestId("summary-subtotal")).toHaveText("฿2,370");
  await expect(page.getByTestId("summary-shipping")).toHaveText("ฟรี");
  await expect(page.getByTestId("free-shipping-progress")).toHaveText("ได้ส่งฟรีแล้ว!");
});

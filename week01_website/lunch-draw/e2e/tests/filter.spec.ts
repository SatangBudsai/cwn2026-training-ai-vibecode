import { LAZY_TOTAL, TOTAL, byNumber, expect, openHome, poolCount, rowPercent, rows, setRestaurant, showAll, test, walk } from "../fixtures";

const priceButton = (page: import("@playwright/test").Page, label: string) =>
  page.locator("fieldset").getByRole("button", { name: label, exact: true });

test.describe("ตัวกรอง", () => {
  test("TC-FLT-01 ขี้เกียจเดิน เหลือเฉพาะร้านที่เดินไม่เกิน 500 ม. @P1", async ({ page }) => {
    await openHome(page);
    await page.getByRole("switch").check({ force: true });
    await expect(page.getByTestId("pool-count")).toHaveText(String(LAZY_TOTAL));
    expect(LAZY_TOTAL).toBe(49);
    await showAll(page);
    const numbers = await rows(page).evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-number"))));
    expect(numbers).toHaveLength(LAZY_TOTAL);
    expect(numbers.every((n) => walk(byNumber.get(n)!) <= 500)).toBeTruthy();
  });

  test("TC-FLT-02 กรองราคา ฿ ตอนที่ยังไม่มีร้านไหนมีราคา @P2", async ({ page }) => {
    await openHome(page);
    await priceButton(page, "฿").click();
    await expect(page.getByTestId("pool-count")).toHaveText("0");
    await expect(page.getByText("ไม่มีร้านที่ตรงกับตัวกรองนี้")).toBeVisible();
    await expect(page.getByRole("button", { name: "จับสลาก", exact: true })).toBeDisabled();
  });

  test("TC-FLT-03 กรองราคาตามที่ตั้งไว้ให้ร้าน @P1", async ({ page }) => {
    await setRestaurant(page, 1, { priceLevel: 1 });
    await setRestaurant(page, 2, { priceLevel: 2 });
    await openHome(page);

    await priceButton(page, "฿").click();
    await expect(page.getByTestId("pool-count")).toHaveText("1");
    expect(await rowPercent(page, 1)).toBe("100.0%");

    await priceButton(page, "฿฿").click();
    await expect(page.getByTestId("pool-count")).toHaveText("2");
    expect(await rowPercent(page, 2)).toBe("50.0%");

    await page.locator("fieldset").getByRole("button", { name: "ทุกราคา" }).click();
    await expect(page.getByTestId("pool-count")).toHaveText(String(TOTAL));
  });

  test("TC-FLT-04 ไม่ระบุราคา คือร้านที่ยังไม่มีใครใส่ราคา @P2", async ({ page }) => {
    await setRestaurant(page, 1, { priceLevel: 1 });
    await openHome(page);
    await priceButton(page, "ไม่ระบุ").click();
    await expect(page.getByTestId("pool-count")).toHaveText(String(TOTAL - 1));
  });

  test("TC-FLT-05 ตัวกรองยังอยู่หลังรีโหลด @P3", async ({ page }) => {
    await openHome(page);
    await page.getByRole("switch").check({ force: true });
    await expect(page.getByTestId("pool-count")).toHaveText(String(LAZY_TOTAL));
    await page.reload();
    await expect(page.getByTestId("pool-count")).toHaveText(String(LAZY_TOTAL));
    expect(await poolCount(page)).toBe(LAZY_TOTAL);
  });
});

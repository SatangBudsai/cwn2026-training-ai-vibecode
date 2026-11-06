import { LAZY_TOTAL, SEED, TOTAL, byNumber, expect, openHome, pct, poolCount, row, rowPercent, rows, setRestaurant, showAll, test, topRowNumber, walk } from "../fixtures";

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
    await expect(page.getByRole("button", { name: "สุ่มร้าน", exact: true })).toBeDisabled();
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

  test("TC-FLT-06 ขี้เกียจเดิน ร้านยิ่งใกล้ยิ่งมีโอกาสสูง @P1", async ({ page }) => {
    await openHome(page);
    await page.getByRole("switch").check({ force: true });
    // weight = 1 + (500 − walk) / 500  ->  ×2 at the door, ×1 at 500 m
    const lazy = SEED.filter((r) => walk(r) <= 500);
    const w = (r: (typeof SEED)[number]) => 1 + (1 - Math.min(500, walk(r)) / 500);
    const total = lazy.reduce((s, r) => s + w(r), 0);
    const nearest = [...lazy].sort((a, b) => walk(a) - walk(b))[0];
    const farthest = [...lazy].sort((a, b) => walk(b) - walk(a))[0];

    expect(await topRowNumber(page)).toBe(nearest.number);
    expect(await rowPercent(page, nearest.number)).toBe(pct(w(nearest) / total));
    await expect(row(page, nearest.number)).toContainText(`ใกล้ ×${w(nearest).toFixed(1)}`);
    await showAll(page);
    expect(await rowPercent(page, farthest.number)).toBe(pct(w(farthest) / total));
    // odds go down as the walk gets longer
    const ps = await rows(page).getByTestId("odds-p").allTextContents();
    const nums = await rows(page).evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-number"))));
    const walks = nums.map((n) => walk(byNumber.get(n)!));
    for (let i = 1; i < walks.length; i++) expect(walks[i]).toBeGreaterThanOrEqual(walks[i - 1] - 1);
    expect(ps.length).toBe(LAZY_TOTAL);
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

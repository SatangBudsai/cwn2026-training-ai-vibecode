import { CATEGORIES } from "../../src/lib/categories";
import { TOTAL, draw, expect, openHome, poolCount, rows, showAll, test } from "../fixtures";

test.describe("หน้าแรก", () => {
  test("TC-HOME-01 หน้าแรกแสดงครบ @P2", async ({ page }) => {
    await openHome(page);
    await expect(page.getByRole("heading", { name: "วันนี้กินร้านไหน" })).toBeVisible();
    expect(await poolCount(page)).toBe(TOTAL);
    await expect(page.locator('li[data-testid^="cat-"]')).toHaveCount(CATEGORIES.length);
    await expect(rows(page)).toHaveCount(15);
    await expect(page.getByRole("button", { name: "สุ่มร้าน", exact: true })).toBeEnabled();
  });

  test("TC-HOME-02 แสดงร้านทั้งหมดและย่อกลับ @P3", async ({ page }) => {
    await openHome(page);
    await showAll(page);
    await expect(rows(page)).toHaveCount(TOTAL);
    await page.getByRole("button", { name: "แสดงเฉพาะ 15 อันดับแรก" }).click();
    await expect(rows(page)).toHaveCount(15);
  });

  test("TC-HOME-03 ทุกร้านโอกาสเท่ากันเมื่อยังไม่มีใครโหวต @P2", async ({ page }) => {
    await openHome(page);
    const even = `${((1 / TOTAL) * 100).toFixed(1)}%`;
    const texts = await rows(page).getByTestId("odds-p").allTextContents();
    expect(texts.every((t) => t.trim() === even)).toBeTruthy();
  });

  test("TC-HOME-04 เมนูประวัติพาไปหน้าประวัติ @P3", async ({ page }) => {
    await openHome(page);
    await page.getByRole("link", { name: "ประวัติ" }).click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByRole("heading", { name: "สุ่มได้บ่อยใน 7 วัน" })).toBeVisible();
  });
});

test.describe("มือถือ", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("TC-MOB-01 ปุ่มสุ่มร้านอยู่บนสุด ไม่มี scroll แนวนอน @P3", async ({ page }) => {
    await openHome(page);
    const drawBtn = await page.getByRole("button", { name: "สุ่มร้าน", exact: true }).boundingBox();
    const board = await page.getByRole("heading", { name: "โอกาสของแต่ละร้าน" }).boundingBox();
    expect(drawBtn!.y).toBeLessThan(board!.y);
    expect(drawBtn!.y + drawBtn!.height).toBeLessThan(844); // visible without scrolling
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("TC-MOB-02 สุ่มร้านแล้วเห็นการ์ดผลบนจอ @P3", async ({ page }) => {
    await openHome(page);
    await draw(page);
    await expect(page.getByTestId("winner")).toBeInViewport({ ratio: 0.3 });
  });
});

import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { SEED, TOTAL, catSwitch, vote, expect, openHome, pct, rowPercent, setRestaurant, test, topRowNumber } from "../fixtures";

const catFile = () => JSON.parse(readFileSync("e2e/.data/categories.json", "utf8")) as { id: string; label: string }[];
const restFile = () => JSON.parse(readFileSync("e2e/.data/restaurants.json", "utf8")) as { number: number; categories: string[] }[];
const rowOf = (page: Page, label: string) => page.getByTestId("category-row").filter({ has: page.getByTestId("category-label").getByText(label, { exact: true }) });

async function addCategory(page: Page, label: string) {
  await page.getByLabel("ชื่อประเภทอาหารใหม่").fill(label);
  await page.getByRole("button", { name: "เพิ่มประเภท" }).click();
  await expect(rowOf(page, label)).toHaveCount(1);
}

test.describe("จัดการประเภทอาหาร", () => {
  test("TC-CAT-01 เพิ่มประเภทอาหารใหม่ แล้วใช้ได้ทันที @P1", async ({ page }) => {
    await openHome(page);
    await page.getByRole("link", { name: "จัดการประเภทอาหาร" }).click();
    await expect(page).toHaveURL(/\/categories$/);
    await addCategory(page, "ติ่มซำ");
    expect(catFile().some((c) => c.label === "ติ่มซำ")).toBeTruthy();

    await openHome(page);
    await expect(catSwitch(page, "ติ่มซำ")).toBeVisible();
    // also offered when editing a restaurant
    await page.locator('[data-testid="odds-row"][data-number="1"]').getByTestId("odds-open").click();
    await expect(page.getByRole("button", { name: "ติ่มซำ", exact: true })).toBeVisible();
  });

  test("TC-CAT-02 แก้ชื่อประเภทอาหาร @P2", async ({ page }) => {
    await page.goto("/categories");
    await rowOf(page, "อาหารเกาหลี").getByRole("button", { name: "แก้ชื่อ อาหารเกาหลี" }).click();
    await page.getByLabel("ชื่อประเภทอาหาร", { exact: true }).fill("เกาหลี / หมูกระทะ");
    await page.getByRole("button", { name: "บันทึกชื่อ" }).click();
    await expect(rowOf(page, "เกาหลี / หมูกระทะ")).toHaveCount(1);
    await openHome(page);
    await expect(page.getByTestId("cat-korean")).toContainText("เกาหลี / หมูกระทะ");
  });

  test("TC-CAT-03 ลบประเภทอาหาร เอาออกจากทุกร้าน @P1", async ({ page }) => {
    const japanese = SEED.filter((r) => r.categories.includes("japanese"));
    await page.goto("/categories");
    const r = rowOf(page, "อาหารญี่ปุ่น");
    await expect(r).toContainText(`${japanese.length} ร้าน`);
    await r.getByRole("button", { name: "ลบ อาหารญี่ปุ่น" }).click();
    await expect(r).toContainText(`เอาออกจาก ${japanese.length} ร้าน`);
    await r.getByRole("button", { name: "ยืนยันลบ" }).click();
    await expect(rowOf(page, "อาหารญี่ปุ่น")).toHaveCount(0);

    expect(catFile().some((c) => c.id === "japanese")).toBeFalsy();
    expect(restFile().some((x) => x.categories.includes("japanese"))).toBeFalsy();
    await openHome(page);
    await expect(page.getByTestId("cat-japanese")).toHaveCount(0);
    expect(await page.getByTestId("pool-count").textContent()).toBe(String(TOTAL)); // restaurants stay
  });

  test("TC-CAT-04 ชื่อว่างหรือซ้ำ เพิ่มไม่ได้ @P3", async ({ page, request }) => {
    await page.goto("/categories");
    await expect(page.getByRole("button", { name: "เพิ่มประเภท" })).toBeDisabled();
    await page.getByLabel("ชื่อประเภทอาหารใหม่").fill("อาหารจีน");
    await page.getByRole("button", { name: "เพิ่มประเภท" }).click();
    await expect(page.getByText("มีประเภทอาหารนี้อยู่แล้ว")).toBeVisible();
    expect((await request.post("/api/categories", { data: { label: "  " } })).status()).toBe(400);
    expect((await request.post("/api/categories", { data: { label: "อาหารจีน" } })).status()).toBe(409);
    expect((await request.delete("/api/categories/nope")).status()).toBe(404);
  });

  test("TC-CAT-05 แนวใหม่ใช้โหวตได้ @P2", async ({ page }) => {
    const res = await page.request.post("/api/categories", { data: { label: "ข้าวมันไก่" } });
    const { id } = await res.json();
    await setRestaurant(page, 7, { categories: [id] });
    await openHome(page);
    await vote(catSwitch(page, "ข้าวมันไก่"), "เห็นด้วย");
    expect(await topRowNumber(page)).toBe(7);
    await expect.poll(() => rowPercent(page, 7)).toBe(pct(1.5 / (TOTAL - 1 + 1.5)));
  });
});

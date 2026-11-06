import { readFileSync } from "node:fs";
import { SEED, TOTAL, byNumber, expect, openHome, pct, poolCount, row, rowPercent, test, topRowNumber } from "../fixtures";

const dataFile = () => JSON.parse(readFileSync("e2e/.data/restaurants.json", "utf8")) as { number: number; [k: string]: unknown }[];

async function openEditor(page: import("@playwright/test").Page, n: number) {
  await row(page, n).getByTestId("odds-open").click();
  await expect(page.getByRole("button", { name: "บันทึก" })).toBeVisible();
}

test.describe("แก้ข้อมูลร้าน", () => {
  test("TC-EDIT-01 ตั้งชื่อเล่นร้าน แสดงแทนชื่อจริงและบันทึกลงไฟล์ @P1", async ({ page }) => {
    const r = byNumber.get(1)!;
    await openHome(page);
    await openEditor(page, 1);
    await page.getByPlaceholder(r.name).fill("ร้านประจำ");
    await page.getByRole("button", { name: "บันทึก" }).click();

    await expect(row(page, 1).getByTestId("odds-name")).toHaveText("ร้านประจำ");
    await expect(row(page, 1)).toContainText(r.name); // real name stays as the subtitle
    await page.reload();
    await expect(row(page, 1).getByTestId("odds-name")).toHaveText("ร้านประจำ");
    await expect.poll(() => dataFile().find((x) => x.number === 1)?.nickname).toBe("ร้านประจำ");
  });

  test("TC-EDIT-02 ลบชื่อเล่นแล้วกลับเป็นชื่อจริง @P3", async ({ page }) => {
    const r = byNumber.get(1)!;
    await openHome(page);
    await openEditor(page, 1);
    await page.getByPlaceholder(r.name).fill("ชั่วคราว");
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(row(page, 1).getByTestId("odds-name")).toHaveText("ชั่วคราว");
    await openEditor(page, 1);
    await page.getByPlaceholder(r.name).fill("");
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(row(page, 1).getByTestId("odds-name")).toHaveText(r.name);
  });

  test("TC-EDIT-03 ปิดร้าน แล้วกลับมาสุ่ม @P1", async ({ page }) => {
    await openHome(page);
    await openEditor(page, 1);
    await page.getByRole("button", { name: "ไม่สุ่มร้านนี้" }).click();

    await expect(page.getByTestId("pool-count")).toHaveText(String(TOTAL - 1));
    await expect(row(page, 1)).toHaveCount(0);
    const closed = page.getByRole("button", { name: /ร้านที่ไม่สุ่ม/ });
    await expect(closed).toContainText("1");
    await closed.click();
    const item = page.locator('[data-testid="disabled-row"][data-number="1"]');
    await expect(item).toBeVisible();

    await item.getByRole("button", { name: "กลับมาสุ่ม" }).click();
    await expect(page.getByTestId("pool-count")).toHaveText(String(TOTAL));
    await expect(row(page, 1)).toBeVisible();
  });

  test("TC-EDIT-04 แก้ประเภทอาหารของร้าน @P2", async ({ page }) => {
    const r = byNumber.get(3)!; // Mama Mia Bangkok
    const before = SEED.filter((x) => x.categories.includes("japanese")).length;
    test.skip(r.categories.includes("japanese"), "restaurant #3 is already japanese");
    await openHome(page);
    await expect(page.getByTestId("cat-japanese")).toContainText(`${before} ร้าน`);
    await openEditor(page, 3);
    await page.getByRole("button", { name: "อาหารญี่ปุ่น", exact: true }).click();
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(row(page, 3)).toContainText("อาหารญี่ปุ่น");
    await expect(page.getByTestId("cat-japanese")).toContainText(`${before + 1} ร้าน`);
  });

  test("TC-EDIT-05 ต้องเลือกประเภทอาหารอย่างน้อย 1 ประเภท @P3", async ({ page }) => {
    const r = byNumber.get(1)!;
    await openHome(page);
    await openEditor(page, 1);
    const labels: Record<string, string> = { "rice-curry": "ข้าวแกง", thai: "อาหารไทย", "made-to-order": "อาหารตามสั่ง" };
    for (const c of r.categories) await page.getByRole("button", { name: labels[c] ?? c, exact: true }).click();
    await expect(page.getByRole("button", { name: "บันทึก" })).toBeDisabled();
  });

  test("TC-EDIT-06 ตัวคูณโอกาส ×2 ทำให้โอกาสเป็นสองเท่า @P2", async ({ page }) => {
    await openHome(page);
    await openEditor(page, 2);
    await page.getByRole("button", { name: "เพิ่มตัวคูณ" }).click();
    await page.getByRole("button", { name: "เพิ่มตัวคูณ" }).click();
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(row(page, 2)).toContainText("ตัวคูณ ×2");
    expect(await topRowNumber(page)).toBe(2);
    await expect.poll(() => rowPercent(page, 2)).toBe(pct(2 / (TOTAL + 1)));
  });

  test("TC-EDIT-07 ตั้งราคาร้านจากหน้าแก้ไข @P2", async ({ page }) => {
    await openHome(page);
    await openEditor(page, 4);
    await page.getByRole("button", { name: /^฿฿\s*60–120/ }).click();
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(row(page, 4)).toContainText("฿฿");
    await expect.poll(() => dataFile().find((x) => x.number === 4)?.priceLevel).toBe(2);
    expect(await poolCount(page)).toBe(TOTAL);
  });
});

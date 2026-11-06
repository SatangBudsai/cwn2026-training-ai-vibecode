import { SEED, TOTAL, byNumber, expect, openHome, pct, rowPercent, rows, setRestaurant, test, walk } from "../fixtures";

const box = (page: import("@playwright/test").Page) => page.getByLabel("ค้นหาร้าน");
const shownNumbers = (page: import("@playwright/test").Page) =>
  rows(page).evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-number"))));

test.describe("ค้นหาร้าน", () => {
  test("TC-SEARCH-01 ค้นหาด้วยชื่อร้าน แสดงเฉพาะร้านที่ตรง @P1", async ({ page }) => {
    // the name, or the category label "ก๋วยเตี๋ยว / เมนูเส้น"
    const want = SEED.filter((r) => r.name.includes("ก๋วยเตี๋ยว") || r.categories.includes("noodle"));
    await openHome(page);
    await box(page).fill("ก๋วยเตี๋ยว");
    await expect(page.getByTestId("search-status")).toHaveText(`พบ ${want.length} ร้าน`);
    const shown = await shownNumbers(page);
    expect(shown.sort((a, b) => a - b)).toEqual(want.map((r) => r.number).sort((a, b) => a - b));
    // search never changes the odds
    expect(await rowPercent(page, shown[0])).toBe(pct(1 / TOTAL));
    await expect(page.getByTestId("pool-count")).toHaveText(String(TOTAL));
  });

  test("TC-SEARCH-02 ค้นหาด้วยประเภทอาหาร ชื่อเล่น และเบอร์ร้าน @P2", async ({ page }) => {
    await setRestaurant(page, 4, { nickname: "ร้านเฉพาะทดสอบ" });
    await openHome(page);

    await box(page).fill("เฉพาะทดสอบ");
    expect(await shownNumbers(page)).toEqual([4]);

    await box(page).fill("#12");
    expect(await shownNumbers(page)).toEqual(expect.arrayContaining([12]));
    await expect(rows(page).first()).toHaveAttribute("data-number", "12");

    const indian = SEED.filter((r) => r.categories.includes("indian"));
    await box(page).fill("อาหารอินเดีย");
    await expect(page.getByTestId("search-status")).toHaveText(`พบ ${indian.length} ร้าน`);
  });

  test("TC-SEARCH-03 ร้านที่ตรงคำค้นแต่ถูกตัวกรองซ่อน มีข้อความบอก @P2", async ({ page }) => {
    const far = SEED.find((r) => walk(r) > 900 && !SEED.some((o) => o !== r && o.name === r.name))!;
    await openHome(page);
    await page.getByRole("switch").check({ force: true });
    await box(page).fill(far.name);
    await expect(page.getByTestId("search-status")).toContainText("ไม่พบร้านที่ตรงกับคำค้น");
    await expect(page.getByTestId("search-status")).toContainText("อีก 1 ร้านตรงคำค้นแต่ถูกตัวกรองซ่อนไว้");
    await expect(page.getByText(`ไม่พบร้านที่ตรงกับ “${far.name}”`)).toBeVisible();
  });

  test("TC-SEARCH-04 ล้างคำค้นด้วยปุ่ม X หรือ Esc กลับมาแสดงตามปกติ @P3", async ({ page }) => {
    await openHome(page);
    await box(page).fill("zzzz-ไม่มีร้านนี้");
    await expect(page.getByTestId("search-status")).toHaveText("ไม่พบร้านที่ตรงกับคำค้น");
    await expect(rows(page)).toHaveCount(0);
    await page.getByRole("button", { name: "ล้างคำค้น" }).click();
    await expect(rows(page)).toHaveCount(15);
    await box(page).fill("ข้าว");
    await box(page).press("Escape");
    await expect(box(page)).toHaveValue("");
    await expect(rows(page)).toHaveCount(15);
  });

  test("TC-SEARCH-05 ค้นหาบนแผนที่ เหลือเฉพาะหมุดที่ตรง และแผงขวาแสดงผลการค้นหา @P2", async ({ page }) => {
    const want = SEED.filter((r) => r.categories.includes("japanese"));
    await openHome(page);
    await page.getByRole("radio", { name: "แผนที่" }).click();
    await box(page).fill("อาหารญี่ปุ่น");
    await expect(page.getByTestId("map-pin")).toHaveCount(want.length);
    const panel = page.getByTestId("map-panel");
    await expect(panel).toContainText(`ผลการค้นหา ${Math.min(12, want.length)} ร้าน`);
    await panel.getByRole("button").first().click();
    const n = Number(await page.getByTestId("map-selected").getAttribute("data-number"));
    expect(byNumber.get(n)!.categories).toContain("japanese");
  });
});

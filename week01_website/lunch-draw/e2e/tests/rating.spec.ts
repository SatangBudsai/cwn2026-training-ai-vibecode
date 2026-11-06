import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { TOTAL, draw, expect, newMember, openHome, pct, row, rowPercent, setRestaurant, showAll, test } from "../fixtures";

const ratingsFile = () =>
  JSON.parse(readFileSync("e2e/.data/ratings.json", "utf8")) as { restaurantId: number; rater: string; score: number }[];
const cat = (scope: Page | ReturnType<Page["locator"]>, label: string) =>
  scope.getByRole("button", { name: `ให้คะแนน ${label}`, exact: true });
const rateApi = (page: Page, n: number, rater: string, score: number) =>
  page.request.put(`/api/restaurants/${n}/rating`, { data: { rater, score } });

async function openEditor(page: Page, n: number) {
  await row(page, n).getByTestId("odds-open").click();
  await expect(page.getByRole("button", { name: "บันทึก" })).toBeVisible();
}

test.describe("ให้คะแนนร้าน (รูปแมว)", () => {
  test("TC-RATE-01 ให้คะแนนจากการ์ดผลจับสลาก @P1", async ({ page }) => {
    await openHome(page);
    const n = await draw(page);
    const card = page.getByTestId("winner");
    await cat(card, "อร่อยมาก").click();
    await expect(cat(card, "อร่อยมาก")).toHaveAttribute("aria-pressed", "true");
    await expect(card.getByTestId("rating-avg")).toHaveText("เฉลี่ย อร่อยมาก · 1 คน");

    await showAll(page);
    const summary = row(page, n).getByTestId("rating-summary");
    await expect(summary).toHaveAttribute("data-score", "4");
    await expect(summary.getByRole("img")).toHaveAttribute("src", /good/);
    await expect.poll(() => ratingsFile().find((x) => x.restaurantId === n)?.score).toBe(4);
  });

  test("TC-RATE-02 เปลี่ยนคะแนน และกดซ้ำเพื่อยกเลิก @P2", async ({ page }) => {
    await openHome(page);
    await openEditor(page, 1);
    await cat(page, "โอเค").click();
    await expect(row(page, 1).getByTestId("rating-summary")).toHaveAttribute("data-score", "3");
    await cat(page, "ไม่ไหว").click();
    await expect(row(page, 1).getByTestId("rating-summary")).toHaveAttribute("data-score", "1");
    await expect(page.getByTestId("rating-avg")).toHaveText("เฉลี่ย ไม่ไหว · 1 คน"); // replaced, not added
    await expect.poll(() => ratingsFile().filter((x) => x.restaurantId === 1).length).toBe(1);

    await cat(page, "ไม่ไหว").click(); // take it back
    await expect(row(page, 1).getByTestId("rating-summary")).toHaveCount(0);
    await expect.poll(() => ratingsFile().length).toBe(0);
  });

  test("TC-RATE-03 หลายคนให้คะแนน แสดงค่าเฉลี่ย @P2", async ({ page }) => {
    await rateApi(page, 1, "tester-aaaa", 4);
    await rateApi(page, 1, "tester-bbbb", 2);
    await openHome(page);
    const summary = row(page, 1).getByTestId("rating-summary");
    await expect(summary).toHaveAttribute("data-score", "3"); // (4 + 2) / 2 = โอเค
    await expect(summary).toContainText("2");
    await openEditor(page, 1);
    await expect(page.getByTestId("rating-avg")).toHaveText("เฉลี่ย โอเค · 2 คน");
  });

  test("TC-RATE-04 คะแนนมีผลกับโอกาสถูกสุ่ม @P1", async ({ page }) => {
    // average "อร่อยมาก" -> ×1.4, average "ไม่ไหว" -> ×0.6, not rated -> ×1
    await rateApi(page, 1, "tester-aaaa", 4);
    await rateApi(page, 2, "tester-aaaa", 1);
    await openHome(page);
    const total = TOTAL - 2 + 1.4 + 0.6;
    await expect.poll(() => rowPercent(page, 1)).toBe(pct(1.4 / total));
    await showAll(page);
    expect(await rowPercent(page, 2)).toBe(pct(0.6 / total));
  });

  test("TC-RATE-05 ให้คะแนนจากแผงร้านบนแผนที่ @P2", async ({ page }) => {
    await openHome(page);
    await page.getByRole("radio", { name: "แผนที่" }).click();
    // pick a restaurant from the side list (no pin overlap issues)
    await setRestaurant(page, 1, { baseWeight: 2 }); // makes #1 the top place
    await page.getByTestId("map-panel").getByRole("button").first().click();
    const panel = page.getByTestId("map-selected");
    await expect(panel).toBeVisible();
    await cat(panel, "เฉยๆ").click();
    await expect(panel.getByTestId("rating-avg")).toHaveText("เฉลี่ย เฉยๆ · 1 คน");
  });

  test("TC-RATE-06 คนอื่นเห็นคะแนนทันที (realtime) @P2", async ({ page, browser }) => {
    const other = await newMember(browser);
    await openHome(other);
    await rateApi(page, 1, "tester-aaaa", 4);
    await expect(other.locator('[data-testid="odds-row"][data-number="1"]').getByTestId("rating-summary")).toHaveAttribute(
      "data-score",
      "4",
      { timeout: 3_000 },
    );
    await other.context().close();
  });

  test("TC-RATE-07 API ให้คะแนนตรวจข้อมูลไม่ถูกต้อง @P2", async ({ page }) => {
    expect((await rateApi(page, 1, "tester-aaaa", 5)).status()).toBe(400);
    expect((await rateApi(page, 1, "x", 3)).status()).toBe(400);
    expect((await rateApi(page, 99999, "tester-aaaa", 3)).status()).toBe(404);
    expect(ratingsFile()).toHaveLength(0);
  });
});

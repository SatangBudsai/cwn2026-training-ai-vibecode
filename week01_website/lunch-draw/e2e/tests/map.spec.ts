import type { Page } from "@playwright/test";
import { LAZY_TOTAL, TOTAL, byNumber, draw, expect, openHome, test } from "../fixtures";

const pins = (page: Page) => page.getByTestId("map-pin");
const pin = (page: Page, n: number) => page.locator(`[data-testid="map-pin"][data-number="${n}"]`);

async function openMap(page: Page) {
  await openHome(page);
  await page.getByRole("radio", { name: "แผนที่" }).click();
  await expect(page.getByTestId("odds-map")).toBeVisible();
  await expect(pins(page).first()).toBeVisible();
}

/** Pins inside the map view that no other pin overlaps: the only ones a person can click directly */
async function freePins(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const map = document.querySelector('[data-testid="odds-map"]')!.getBoundingClientRect();
    const all = [...document.querySelectorAll<HTMLElement>('[data-testid="map-pin"]')].map((el) => {
      const r = el.getBoundingClientRect();
      return { n: Number(el.dataset.number), x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    const inside = (p: { x: number; y: number }) =>
      p.x > map.left + 40 && p.x < map.right - 60 && p.y > map.top + 50 && p.y < map.bottom - 40;
    return all
      .filter((p) => inside(p) && all.every((q) => q === p || Math.hypot(q.x - p.x, q.y - p.y) > 26))
      .map((p) => p.n);
  });
}

/** Select restaurant n like a person would: click its spot, then pick it from the list if pins overlap */
async function selectOnMap(page: Page, n: number) {
  await pin(page, n).click({ force: true });
  const panel = page.getByTestId("map-selected");
  await expect(panel).toBeVisible();
  if ((await panel.getAttribute("data-number")) !== String(n)) {
    await page.getByTestId("map-here").getByRole("button", { name: new RegExp(`^${String(n).padStart(2, "0")}\\D`) }).click();
  }
  await expect(panel).toHaveAttribute("data-number", String(n));
  return panel;
}

test.describe("มุมมองแผนที่", () => {
  test("TC-MAP-01 สลับเป็นแผนที่ เห็นหมุดทุกร้าน @P1", async ({ page }) => {
    await openMap(page);
    await expect(page.getByRole("radio", { name: "แผนที่" })).toHaveAttribute("aria-checked", "true");
    await expect(pins(page)).toHaveCount(TOTAL);
    await expect(page.getByTestId("odds-row")).toHaveCount(0); // the list is hidden
  });

  test("TC-MAP-02 หมุดตามตัวกรอง ขี้เกียจเดิน @P2", async ({ page }) => {
    await openMap(page);
    await page.getByRole("switch").check({ force: true });
    await expect(pins(page)).toHaveCount(LAZY_TOTAL);
  });

  test("TC-MAP-03 กดหมุดแล้วเห็นร้าน โอกาส และโหวตได้ @P1", async ({ page }) => {
    await openMap(page);
    const panel = await selectOnMap(page, 5);
    await expect(panel).toContainText(byNumber.get(5)!.name);
    await expect(panel.getByTestId("map-selected-p")).toHaveText(`${((1 / TOTAL) * 100).toFixed(1)}%`);
    await panel.getByRole("button", { name: /^อยากไปร้าน/ }).click();
    await expect(panel.getByTestId("vote-net")).toHaveText("+1");
    await expect(panel.getByTestId("map-selected-p")).toHaveText(`${((1.5 / (TOTAL + 0.5)) * 100).toFixed(1)}%`);
    await expect(panel.getByRole("link").first()).toHaveAttribute("href", /travelmode=walking/);
  });

  test("TC-MAP-06 ชี้หมุดเห็นชื่อร้าน กดหมุดอื่นแล้วรายละเอียดด้านขวาเปลี่ยนตาม @P1", async ({ page }) => {
    await openMap(page);
    const free = await freePins(page);
    expect(free.length).toBeGreaterThanOrEqual(3);
    const [a, b, c] = free;

    // hover: popover with the name
    const tip = pin(page, a).locator(".map-pin-tip");
    await expect(tip).toHaveCSS("opacity", "0");
    await pin(page, a).hover();
    await expect(tip).toContainText(byNumber.get(a)!.name);
    await expect(tip).toHaveCSS("opacity", "1");

    // click different pins: the side panel follows each one (each pin shows its own place)
    const panel = page.getByTestId("map-selected");
    for (const n of [a, b, c]) {
      await pin(page, n).click();
      await expect(panel).toHaveAttribute("data-number", String(n));
      await expect(panel.getByRole("heading", { level: 3 })).toHaveText(byNumber.get(n)!.name);
    }
    // the panel sits to the right of the map on desktop
    const mapBox = (await page.getByTestId("odds-map").boundingBox())!;
    const panelBox = (await page.getByTestId("map-panel").boundingBox())!;
    expect(panelBox.x).toBeGreaterThan(mapBox.x + mapBox.width - 1);

    await panel.getByRole("button", { name: "ปิด" }).click();
    await expect(page.getByTestId("map-panel")).toContainText("โอกาสสูงสุด");
  });

  test("TC-MAP-07 หมุดที่ซ้อนกัน เลือกร้านจากรายการ ร้านในจุดเดียวกัน @P2", async ({ page }) => {
    // several places share one building near the office (e.g. #3): their pins sit on top of each other
    await openMap(page);
    await pin(page, 3).click({ force: true });
    const here = page.getByTestId("map-here");
    await expect(here).toContainText(/ร้านในจุดเดียวกัน \d+ ร้าน/);
    const items = here.getByRole("button");
    expect(await items.count()).toBeGreaterThan(1);
    const panel = page.getByTestId("map-selected");
    for (const i of [1, 0]) {
      const n = Number((await items.nth(i).textContent())!.match(/^\d+/)![0]);
      await items.nth(i).click();
      await expect(panel).toHaveAttribute("data-number", String(n));
      await expect(panel.getByRole("heading", { level: 3 })).toHaveText(byNumber.get(n)!.name);
    }
  });

  test("TC-MAP-04 หมุดที่มีโอกาสสูงใหญ่กว่า @P3", async ({ page }) => {
    await openMap(page);
    const [n] = await freePins(page);
    const dot = pin(page, n).locator(".map-pin-dot");
    const before = (await dot.boundingBox())!.width;
    const panel = await selectOnMap(page, n);
    await panel.getByRole("button", { name: /^อยากไปร้าน/ }).click();
    await expect.poll(async () => (await dot.boundingBox())!.width).toBeGreaterThan(before);
  });

  test("TC-MAP-05 จับสลากบนแผนที่ หมุดร้านที่ได้เด่นขึ้น และกลับไปมุมมองรายการได้ @P2", async ({ page }) => {
    await openMap(page);
    const n = await draw(page);
    await expect.poll(async () => (await pin(page, n).locator(".map-pin-dot").boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(18);
    await page.getByRole("radio", { name: "รายการ" }).click();
    await expect(page.getByTestId("odds-row").first()).toBeVisible();
    await expect(pins(page)).toHaveCount(0);
  });
});

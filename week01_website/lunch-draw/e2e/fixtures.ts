import { readFileSync } from "node:fs";
import { test as base, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

/** The restaurant data every test starts from */
export type SeedRestaurant = {
  number: number;
  name: string;
  nameEn: string | null;
  lat: number;
  lon: number;
  distance: number;
  walkDistance: number | null;
  categories: string[];
};
export const SEED: SeedRestaurant[] = JSON.parse(readFileSync("e2e/data/restaurants.json", "utf8"));
export const byNumber = new Map(SEED.map((r) => [r.number, r]));
export const walk = (r: SeedRestaurant) => r.walkDistance ?? Math.round(r.distance * 1.3);
export const TOTAL = SEED.length;
export const LAZY_TOTAL = SEED.filter((r) => walk(r) <= 500).length;

/** Same rounding as the app (formatPercent) */
export const pct = (p: number) => (p === 0 ? "0%" : p < 0.001 ? "<0.1%" : `${(p * 100).toFixed(1)}%`);

/** Map tiles and the walking route come from the internet: block them so tests are stable offline */
export async function blockExternal(ctx: BrowserContext) {
  await ctx.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
}

export const test = base.extend<{ reset: void }>({
  reset: [
    async ({ request }, provide) => {
      const res = await request.post("/api/test/reset");
      expect(res.ok(), "reset test data").toBeTruthy();
      await provide();
    },
    { auto: true },
  ],
  context: async ({ context }, provide) => {
    await blockExternal(context);
    await provide(context);
  },
});
export { expect };

// ---------- page helpers ----------

export async function openHome(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("pool-count")).toBeVisible();
}

export async function poolCount(page: Page) {
  return Number(await page.getByTestId("pool-count").textContent());
}

export const rows = (page: Page) => page.getByTestId("odds-row");
export const row = (page: Page, n: number) => page.locator(`[data-testid="odds-row"][data-number="${n}"]`);

export async function rowPercent(page: Page, n: number) {
  return (await row(page, n).getByTestId("odds-p").textContent())?.trim();
}

export async function topRowNumber(page: Page) {
  return Number(await rows(page).first().getAttribute("data-number"));
}

export async function showAll(page: Page) {
  await page.getByRole("button", { name: /^แสดงทั้งหมด/ }).click();
}

export async function draw(page: Page) {
  await page.getByRole("button", { name: /^จับสลาก(ใหม่)?$/ }).click();
  const card = page.getByTestId("winner");
  await expect(card).toBeVisible({ timeout: 10_000 });
  return Number(await card.getAttribute("data-number"));
}

export async function setRestaurant(page: Page, n: number, patch: Record<string, unknown>) {
  const res = await page.request.patch(`/api/restaurants/${n}`, { data: patch });
  expect(res.ok(), `PATCH restaurant ${n}`).toBeTruthy();
}

/** A second person on their own browser profile */
export async function newMember(browser: Browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "th-TH" });
  await blockExternal(ctx);
  return ctx.newPage();
}

export async function joinRoom(page: Page, url: string, nickname: string) {
  await page.goto(url);
  await page.getByLabel("ชื่อเล่น").fill(nickname);
  await page.getByRole("button", { name: "เข้าห้อง" }).click();
  await expect(page.getByTestId("vote-status")).toContainText(`คุณคือ ${nickname}`);
}

export async function createRoom(page: Page, nickname: string) {
  await openHome(page);
  await page.getByRole("button", { name: "เปิดห้อง" }).click();
  await page.waitForURL(/\/room\/[A-Z2-9]{4}$/);
  const url = page.url();
  // Next keeps the previous page hidden in the DOM after client navigation;
  // open the shared link fresh, the way other members arrive
  await page.goto(url);
  await page.getByLabel("ชื่อเล่น").fill(nickname);
  await page.getByRole("button", { name: "เข้าห้อง" }).click();
  await expect(page.getByTestId("vote-status")).toContainText(`คุณคือ ${nickname}`);
  return url;
}

import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { LAZY_TOTAL, TOTAL, expect, newMember, openHome, row, showAll, test } from "../fixtures";

const NEW = TOTAL + 1; // the next free restaurant number
const NEAR = "13.7243, 100.5251"; // ~50 m from the office
const dataFile = () => JSON.parse(readFileSync("e2e/.data/restaurants.json", "utf8")) as { number: number; osmId: string; [k: string]: unknown }[];

const paste = (page: Page) => page.getByLabel("หรือวางลิงก์ Google Maps / พิกัด");
const submit = (page: Page) => page.getByRole("button", { name: "เพิ่มร้าน", exact: true }).last();

async function fillValid(page: Page, name = "ข้าวมันไก่ป้าแดง") {
  await paste(page).fill(NEAR);
  await page.getByLabel("ชื่อร้าน", { exact: true }).fill(name);
  await page.getByRole("button", { name: "ข้าวจานเดียว", exact: true }).click();
}

test.describe("เพิ่มร้านเอง", () => {
  test("TC-ADD-01 เพิ่มร้านจากเมนู แล้วขึ้นบนกระดานทันที @P1", async ({ page }) => {
    await openHome(page);
    await page.getByRole("link", { name: "เพิ่มร้าน" }).click();
    await expect(page).toHaveURL(/\/restaurants\/new$/);

    await fillValid(page);
    await page.getByLabel("ชื่อเล่น (ไม่บังคับ)").fill("ป้าแดง");
    await page.getByRole("button", { name: /^฿\s*ไม่เกิน 60/ }).click();
    await submit(page).click();

    const added = page.getByTestId("added");
    await expect(added).toContainText("เพิ่มร้านแล้ว");
    await expect(added).toContainText(String(NEW));
    await expect(added).toContainText("ป้าแดง");

    await page.getByRole("button", { name: "ไปหน้าจับสลาก" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("pool-count").filter({ visible: true })).toHaveText(String(TOTAL + 1));
    await showAll(page);
    const r = row(page, NEW).filter({ visible: true });
    await expect(r.getByTestId("odds-name")).toHaveText("ป้าแดง");
    await expect(r.getByTestId("manual-tag")).toHaveText("เพิ่มเอง");
    await expect(r).toContainText("฿");
    await expect(r).toContainText("ข้าวจานเดียว");

    const saved = dataFile().find((x) => x.number === NEW)!;
    expect(saved.osmId).toMatch(/^manual\//);
    expect(saved).toMatchObject({ name: "ข้าวมันไก่ป้าแดง", nickname: "ป้าแดง", priceLevel: 1, categories: ["one-dish"] });
  });

  test("TC-ADD-02 ปักหมุดด้วยการกดบนแผนที่ @P2", async ({ page }) => {
    await page.goto("/restaurants/new");
    await expect(page.getByTestId("location-status")).toHaveText("ยังไม่ได้ปักหมุด");
    const map = page.getByTestId("location-map");
    await expect(map.locator("canvas")).toBeVisible();
    await map.click({ position: { x: 300, y: 100 } });
    await expect(page.getByTestId("location-status")).toContainText(/13\.7\d+, 100\.5\d+/);
    await expect(page.getByTestId("location-status")).toContainText("ห่างออฟฟิศ");
  });

  test("TC-ADD-03 วางลิงก์ Google Maps แล้วอ่านตำแหน่งได้ @P2", async ({ page }) => {
    await page.goto("/restaurants/new");
    await paste(page).fill("https://www.google.com/maps/place/X/@13.70,100.50,17z/data=!3m1!4b1!3d13.7243!4d100.5251");
    await expect(page.getByTestId("location-status")).toContainText("13.72430, 100.52510");
    await paste(page).fill("https://maps.app.goo.gl/abc123");
    await expect(page.getByText("อ่านตำแหน่งจากข้อความนี้ไม่ได้")).toBeVisible();
  });

  test("TC-ADD-04 ข้อมูลไม่ครบ กดเพิ่มร้านไม่ได้ @P2", async ({ page }) => {
    await page.goto("/restaurants/new");
    const hint = page.getByTestId("form-hint");
    await expect(hint).toHaveText("ยังขาด: ชื่อร้าน, ตำแหน่ง, แนวอาหาร");
    await expect(submit(page)).toBeDisabled();
    await page.getByLabel("ชื่อร้าน", { exact: true }).fill("ร้านทดสอบ");
    await expect(hint).toHaveText("ยังขาด: ตำแหน่ง, แนวอาหาร");
    await paste(page).fill(NEAR);
    await expect(hint).toHaveText("ยังขาด: แนวอาหาร");
    await expect(submit(page)).toBeDisabled();
    await page.getByRole("button", { name: "จีน", exact: true }).click();
    await expect(hint).toHaveText("พร้อมเพิ่มร้าน");
    await expect(submit(page)).toBeEnabled();
  });

  test("TC-ADD-05 ร้านที่ไกลเกิน 2 กม. เพิ่มไม่ได้ @P2", async ({ page }) => {
    await page.goto("/restaurants/new");
    await fillValid(page);
    await paste(page).fill("13.7500, 100.5500"); // about 4 km away
    await expect(page.getByTestId("location-status")).toContainText("ไกลเกิน 2 กม.");
    await expect(submit(page)).toBeDisabled();
    const res = await page.request.post("/api/restaurants", {
      data: { name: "ไกลมาก", lat: 13.75, lon: 100.55, categories: ["thai"] },
    });
    expect(res.status()).toBe(400);
  });

  test("TC-ADD-06 ร้านที่เพิ่มใกล้ออฟฟิศอยู่ในโหมดขี้เกียจเดิน @P2", async ({ page }) => {
    await page.goto("/restaurants/new");
    await fillValid(page);
    await submit(page).click();
    await expect(page.getByTestId("added")).toContainText("อยู่ในโหมดขี้เกียจเดิน");
    await openHome(page);
    await page.getByRole("switch").check({ force: true });
    await expect(page.getByTestId("pool-count")).toHaveText(String(LAZY_TOTAL + 1));
  });

  test("TC-ADD-07 ลบได้เฉพาะร้านที่เพิ่มเอง @P1", async ({ page }) => {
    const res = await page.request.post("/api/restaurants", {
      data: { name: "ร้านจะลบ", lat: 13.7243, lon: 100.5251, categories: ["thai"] },
    });
    expect(res.status()).toBe(201);
    await openHome(page);
    await showAll(page);

    // OSM restaurant: no delete button, API refuses
    await row(page, 1).getByTestId("odds-open").click();
    await expect(page.getByRole("button", { name: "ลบร้านนี้" })).toHaveCount(0);
    expect((await page.request.delete("/api/restaurants/1")).status()).toBe(409);
    await page.getByRole("button", { name: "ยกเลิก" }).click();

    // manual restaurant: two steps to delete
    await row(page, NEW).getByTestId("odds-open").click();
    await page.getByRole("button", { name: "ลบร้านนี้" }).click();
    await expect(row(page, NEW)).toHaveCount(1); // not deleted yet
    await page.getByRole("button", { name: "ยืนยันลบร้าน" }).click();
    await expect(row(page, NEW)).toHaveCount(0);
    await expect(page.getByTestId("pool-count")).toHaveText(String(TOTAL));
    await expect.poll(() => dataFile().some((x) => x.number === NEW)).toBe(false);
  });

  test("TC-ADD-08 API เพิ่มร้านตรวจข้อมูลไม่ถูกต้อง ได้ 400 @P2", async ({ request }) => {
    const ok = { name: "ร้าน", lat: 13.7243, lon: 100.5251, categories: ["thai"] };
    const cases = [
      { ...ok, name: "  " },
      { ...ok, lat: "abc" },
      { ...ok, lat: 200 },
      { ...ok, categories: [] },
      { ...ok, categories: ["pizza"] },
      { ...ok, priceLevel: 9 },
    ];
    for (const data of cases) expect((await request.post("/api/restaurants", { data })).status(), JSON.stringify(data)).toBe(400);
    const r = await (await request.get("/api/restaurants")).json();
    expect(r.restaurants).toHaveLength(TOTAL); // nothing was added
  });

  test("TC-ADD-09 คนอื่นเห็นร้านที่เพิ่มทันที (realtime) @P2", async ({ page, browser }) => {
    const other = await newMember(browser);
    await openHome(other);
    await page.request.post("/api/restaurants", {
      data: { name: "ร้านใหม่สด", lat: 13.7243, lon: 100.5251, categories: ["thai"] },
    });
    await expect(other.getByTestId("pool-count")).toHaveText(String(TOTAL + 1), { timeout: 3_000 });
    await other.context().close();
  });
});

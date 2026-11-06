// W3 · ข้อมูลร้าน และหน้าจอ: test ใหม่จากการสำรวจ (10_TEST-PLAN.md §10)
// ทุกข้อ assert พฤติกรรมที่ถูกต้องตาม story / BR แม้แอปตอนนี้ยังมีบั๊ก จึงคาดว่าจะล้มจนกว่าจะแก้
import type { APIRequestContext, Page } from "@playwright/test";
import { expect, openHome, setRestaurant, test } from "../fixtures";

/** A spot ~55 m from the office: inside the lazy-walk radius and the 2 km add limit */
const NEAR = { lat: 13.7243, lon: 100.5251 };

async function addRestaurant(request: APIRequestContext, body: Record<string, unknown>) {
  const res = await request.post("/api/restaurants", { data: { ...NEAR, categories: ["thai"], ...body } });
  expect(res.status(), `add restaurant ${JSON.stringify(body)}`).toBe(201);
  return (await res.json()) as { number: number };
}

async function restaurant(request: APIRequestContext, n: number) {
  const json = await (await request.get("/api/restaurants")).json();
  return json.restaurants.find((r: { number: number }) => r.number === n);
}

/** Price filter buttons live in the filter fieldset */
const priceButton = (page: Page, label: string) =>
  page.locator("fieldset").getByRole("button", { name: label, exact: true });

const drawButton = (page: Page) => page.getByRole("button", { name: /^(สุ่มร้าน|สุ่มใหม่)$/ });

test.describe("ข้อมูลร้าน (จากการสำรวจ)", () => {
  test("TC-ADD-10 ลบร้านที่เพิ่มเองแล้วเพิ่มใหม่ เลขไม่ซ้ำ ไม่รับข้อมูลเก่า ประวัติไม่เปลี่ยน @P1", async ({ page, request }) => {
    // A: added by hand, rated, drawn and eaten
    const nameA = "ร้านทดสอบเอ";
    const a = await addRestaurant(request, { name: nameA, priceLevel: 4 });
    const rate = await request.put(`/api/restaurants/${a.number}/rating`, { data: { rater: "w3-rater-0001", score: 1 } });
    expect(rate.ok(), "rate A").toBeTruthy();

    // A is the only place that is both within the lazy walk and ฿฿฿฿, so this draw must pick A
    const drawRes = await request.post("/api/draw", { data: { lazy: true, prices: [4] } });
    expect(drawRes.status(), "draw A").toBe(201);
    const d = await drawRes.json();
    expect(d.restaurantId, "the draw picked A").toBe(a.number);
    const eat = await request.patch(`/api/draws/${d.id}`, { data: { eaten: true } });
    expect(eat.ok(), "mark eaten").toBeTruthy();
    const before = await restaurant(request, a.number);
    expect(before.ratingCount).toBe(1);
    expect(before.lastEatenAt).not.toBeNull();

    // delete A, add B
    const del = await request.delete(`/api/restaurants/${a.number}`);
    expect(del.ok(), "delete A").toBeTruthy();
    const nameB = "ร้านใหม่บีไม่เคยกิน";
    const b = await addRestaurant(request, { name: nameB });

    // B is a new place: new number and nothing carried over from A (BR-18)
    expect.soft(b.number, "B must not reuse A's number").not.toBe(a.number);
    const rb = await restaurant(request, b.number);
    expect.soft(rb.ratingAvg, "B has no rating").toBeNull();
    expect.soft(rb.ratingCount, "B has no rating").toBe(0);
    expect.soft(rb.lastEatenAt, "B was never eaten").toBeNull();

    // history of A's draw must not turn into B
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "ผลการสุ่มล่าสุด" })).toBeVisible();
    await expect(page.locator("main"), "history must not show B for A's draw").not.toContainText(nameB);
  });

  test("TC-ADD-11 ชื่อยาวลงท้ายอีโมจิไม่ถูกตัดครึ่งตัว @P3", async ({ request }) => {
    // 79 UTF-16 units + a 2-unit emoji = 81 units: a UTF-16 .slice(0, 80) cuts the emoji in half
    const name = "ร".repeat(79) + "🍜";
    expect(name.length).toBe(81);
    const res = await request.post("/api/restaurants", { data: { ...NEAR, categories: ["thai"], name } });
    // either refused as too long, or stored without a broken character
    if (res.status() !== 201) {
      expect(res.status(), "too long name is refused with 400").toBe(400);
      return;
    }
    const { number } = await res.json();
    const stored: string = (await restaurant(request, number)).name;
    const lone = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
    expect(lone.test(stored), `stored name ends with ${JSON.stringify(stored.slice(-2))}: no half emoji`).toBe(false);
    expect(stored.startsWith("ร".repeat(79))).toBeTruthy();
  });

  test("TC-ADD-12 วางลิงก์ /maps/dir/ และข้อความที่มี % แล้วอ่านตำแหน่งถูก @P3", async ({ page }) => {
    await page.goto("/restaurants/new");
    const paste = page.getByLabel("หรือวางลิงก์ Google Maps / พิกัด");
    const status = page.getByTestId("location-status");
    await expect(status).toContainText("ยังไม่ได้ปักหมุด");

    // directions link: office → restaurant, camera somewhere else. The place is the last stop, not the camera.
    await paste.fill("https://www.google.com/maps/dir/13.7247,100.5245/13.7243,100.5251/@13.72,100.52,17z");
    await expect.soft(status, "directions link: use the destination").toContainText("13.72430, 100.52510");

    // clear the location again, then paste plain text that has a % in it
    await page.reload();
    await expect(status).toContainText("ยังไม่ได้ปักหมุด");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.getByLabel("หรือวางลิงก์ Google Maps / พิกัด").fill("ลด 50% 13.7243, 100.5251");
    await expect(status, "text with %: coordinates are still read").toContainText("13.72430, 100.52510");
    expect(errors, "no script error while reading the pasted text").toEqual([]);
  });
});

test.describe("จัดการประเภทอาหาร (จากการสำรวจ)", () => {
  test("TC-CAT-06 ลบประเภทที่เป็นประเภทเดียวของร้าน ต้องถูกกันหรือย้ายร้าน @P2", async ({ request }) => {
    const all = (await (await request.get("/api/restaurants")).json()).restaurants as { number: number; categories: string[] }[];
    const only = all.filter((r) => r.categories.length === 1 && r.categories[0] === "rice-curry");
    expect(only.length, "seed has restaurants whose only category is ข้าวแกง").toBeGreaterThan(0);

    const res = await request.delete("/api/categories/rice-curry");
    const after = (await (await request.get("/api/restaurants")).json()).restaurants as { number: number; categories: string[] }[];
    const empty = after.filter((r) => r.categories.length === 0).map((r) => r.number);
    // BR-16: every restaurant keeps at least one category — refuse the delete (4xx) or move those places elsewhere
    expect(empty, `DELETE status ${res.status()}: restaurants left with no category`).toEqual([]);
    if (!res.ok()) {
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
      const cats = await (await request.get("/api/categories")).json();
      expect(cats.map((c: { id: string }) => c.id), "refused: ข้าวแกง is still there").toContain("rice-curry");
    }
  });
});

test.describe("มือถือ (จากการสำรวจ)", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("TC-MOB-03 แผนที่บนจอ 390 px ไม่มี scroll แนวนอนแม้ชื่อร้านยาว @P3", async ({ page }) => {
    // a long Thai nickname with no spaces on a place at the top of the odds list
    const longName = "ร้านข้าวมันไก่เจ๊หน่อยสูตรไหหลำต้นตำรับเยาวราชสาขาสีลม".slice(0, 40);
    await setRestaurant(page, 1, { nickname: longName, baseWeight: 5 });
    await openHome(page);
    await page.getByRole("radio", { name: "แผนที่" }).click();
    await expect(page.getByTestId("odds-map")).toBeVisible();
    await expect(page.getByTestId("map-panel")).toContainText(longName);
    const size = await page.evaluate(() => {
      const el = document.scrollingElement!;
      return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    });
    expect(size.scrollWidth, `page is ${size.scrollWidth}px wide on a ${size.clientWidth}px screen`).toBeLessThanOrEqual(size.clientWidth);
  });
});

test.describe("การเข้าถึง (จากการสำรวจ)", () => {
  test("TC-ACC-01 สุ่มด้วยคีย์บอร์ดแล้ว focus ไม่หลุดไป body @P3", async ({ page }) => {
    await openHome(page);
    await page.getByRole("button", { name: "สุ่มร้าน", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("winner")).toBeVisible({ timeout: 10_000 });
    await expect(drawButton(page)).toBeEnabled({ timeout: 10_000 }); // animation finished
    const active = await page.evaluate(() => document.activeElement?.tagName ?? "none");
    expect(active, "focus after a keyboard draw").not.toBe("BODY");
    expect(active).not.toBe("none");
  });
});

test.describe("แผนที่ (จากการสำรวจ)", () => {
  test("TC-MAP-08 ตัวกรองไม่เหลือร้าน แผงแผนที่แสดงข้อความอธิบาย @P3", async ({ page }) => {
    await openHome(page);
    await page.getByRole("switch").check({ force: true });
    await priceButton(page, "฿฿฿฿").click();
    await expect(page.getByTestId("pool-count")).toHaveText("0");
    await page.getByRole("radio", { name: "แผนที่" }).click();
    await expect(page.getByTestId("odds-map")).toBeVisible();
    await expect(page.getByTestId("map-pin")).toHaveCount(0);
    await expect(page.getByTestId("map-panel"), "the map panel explains why there is nothing to draw").toContainText(/ไม่มีร้าน/);
  });
});

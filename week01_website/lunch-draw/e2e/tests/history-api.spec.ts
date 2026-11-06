import { byNumber, expect, test } from "../fixtures";

test.describe("ประวัติ", () => {
  test("TC-HIST-01 ประวัติแสดงผลจับสลากล่าสุดและแชมป์ @P2", async ({ page }) => {
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) {
      const d = await (await page.request.post("/api/draw", { data: {} })).json();
      ids.push(d.restaurantId);
      if (i === 0) await page.request.patch(`/api/draws/${d.id}`, { data: { eaten: true } });
    }
    await page.goto("/history");
    const recent = page.locator("section").filter({ hasText: "ผลจับสลากล่าสุด" }).locator("ol > li");
    await expect(recent).toHaveCount(3);
    // newest first
    await expect(recent.first()).toContainText(byNumber.get(ids[2])!.name);
    const champs = page.locator("section").filter({ hasText: "แชมป์ 7 วันล่าสุด" }).locator("ol > li");
    expect(await champs.count()).toBeGreaterThan(0);
  });

  test("TC-HIST-03 ทุกผลจับสลากมีป้าย ไปกิน / ไม่ได้ไปกิน / รอยืนยัน @P2", async ({ page }) => {
    // 3 solo draws: the oldest confirmed, the middle one skipped, the newest still open
    for (let i = 0; i < 3; i++) {
      const d = await (await page.request.post("/api/draw", { data: {} })).json();
      if (i === 0) await page.request.patch(`/api/draws/${d.id}`, { data: { eaten: true } });
    }
    await page.goto("/history");
    const tags = page.locator("section").filter({ hasText: "ผลจับสลากล่าสุด" }).getByTestId("visit-tag");
    await expect(tags).toHaveCount(3);
    // newest first
    await expect(tags.nth(0)).toHaveText("รอยืนยัน");
    await expect(tags.nth(1)).toHaveText("ไม่ได้ไปกิน");
    await expect(tags.nth(2)).toHaveText("ไปกิน");
  });

  test("TC-HIST-02 ยังไม่มีผลจับสลาก @P3", async ({ page }) => {
    await page.goto("/history");
    await expect(page.getByText("ยังไม่มีผลจับสลาก")).toHaveCount(2);
  });
});

test.describe("API", () => {
  test("TC-API-01 โหวตแนวอาหารที่ไม่มีอยู่ ได้ 400 @P2", async ({ request }) => {
    const { code } = await (await request.post("/api/rooms", { data: {} })).json();
    const m = await (await request.post(`/api/rooms/${code}/members`, { data: { nickname: "ต้น" } })).json();
    const bad = await request.put(`/api/rooms/${code}/votes`, { data: { memberId: m.id, categoryId: "pizza", value: 1 } });
    expect(bad.status()).toBe(400);
    const badValue = await request.put(`/api/rooms/${code}/votes`, { data: { memberId: m.id, categoryId: "noodle", value: 5 } });
    expect(badValue.status()).toBe(400);
  });

  test("TC-API-02 คนที่ไม่ได้อยู่ในห้องโหวตไม่ได้ @P2", async ({ request }) => {
    const { code } = await (await request.post("/api/rooms", { data: {} })).json();
    const res = await request.put(`/api/rooms/${code}/votes`, { data: { memberId: "someone-else", categoryId: "noodle", value: 1 } });
    expect(res.status()).toBe(404);
  });

  test("TC-API-03 แก้ข้อมูลร้านด้วยค่าที่ไม่ถูกต้อง ได้ 400 @P2", async ({ request }) => {
    const cases = [{ baseWeight: 9 }, { baseWeight: 0 }, { priceLevel: 7 }, { categories: [] }, { categories: ["pizza"] }, { disabled: "yes" }];
    for (const data of cases) {
      expect((await request.patch("/api/restaurants/1", { data })).status(), JSON.stringify(data)).toBe(400);
    }
    expect((await request.patch("/api/restaurants/99999", { data: { nickname: "x" } })).status()).toBe(404);
  });

  test("TC-API-04 ไม่มีร้านให้สุ่ม ได้ 409 @P2", async ({ request }) => {
    const res = await request.post("/api/draw", { data: { prices: [1] } });
    expect(res.status()).toBe(409);
    expect((await res.json()).error).toContain("ไม่มีร้านให้สุ่ม");
  });

  test("TC-API-05 realtime stream ส่งสถานะห้องทันทีที่เชื่อมต่อ @P2", async ({ page, request }) => {
    const { code } = await (await request.post("/api/rooms", { data: { lazyMode: true } })).json();
    await page.goto("/history"); // any page, to run fetch in the browser
    const first = await page.evaluate(async (c) => {
      const res = await fetch(`/api/events?room=${c}`);
      const reader = res.body!.getReader();
      const { value } = await reader.read();
      reader.cancel();
      return { type: res.headers.get("content-type"), chunk: new TextDecoder().decode(value) };
    }, code);
    expect(first.type).toContain("text/event-stream");
    expect(first.chunk).toContain("event: room");
    expect(first.chunk).toContain(`"code":"${code}"`);
    expect(first.chunk).toContain('"lazyMode":true');
  });
});

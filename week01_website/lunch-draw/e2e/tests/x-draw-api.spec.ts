import type { APIRequestContext, Page } from "@playwright/test";
import { SEED, TOTAL, expect, openHome, pct, row, rowPercent, test } from "../fixtures";

// W2: draw, odds formula and API hardening found during exploration (EXP-03, 04, 08, 12–16).
// Each test asserts the CORRECT behaviour, so it fails until the bug is fixed.

const DRAW_BUTTON = /^(สุ่มร้าน|สุ่มใหม่)$/;

/** How many draws the history page lists (it shows the newest 30, plenty for these tests) */
async function historyCount(request: APIRequestContext) {
  const html = await (await request.get("/history")).text();
  return (html.match(/data-testid="visit-tag"/g) ?? []).length;
}

async function restaurant(request: APIRequestContext, n: number) {
  const { restaurants } = await (await request.get("/api/restaurants")).json();
  return restaurants.find((r: { number: number }) => r.number === n);
}

/** Wait until a UI draw has finished: the response came back and the button is usable again */
async function settleDraw(page: Page, firstResponse: Promise<unknown>) {
  await firstResponse;
  await expect(page.getByTestId("winner")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "สุ่มใหม่" })).toBeEnabled({ timeout: 15_000 });
  // late duplicate requests (the bug) would land within this window
  await page.waitForTimeout(1_000);
}

test.describe("สุ่มร้าน", () => {
  test("TC-DRAW-07 ดับเบิลคลิก / กด Enter รัว สร้างผลสุ่มครั้งเดียว @P2", async ({ page, request }) => {
    await openHome(page);
    let posts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && new URL(r.url()).pathname === "/api/draw") posts++;
    });
    const isDraw = (r: { url(): string; request(): { method(): string } }) =>
      new URL(r.url()).pathname === "/api/draw" && r.request().method() === "POST";

    // double click
    let first = page.waitForResponse(isDraw);
    await page.getByRole("button", { name: DRAW_BUTTON }).dblclick();
    await settleDraw(page, first);
    expect.soft(posts, "ดับเบิลคลิก → POST /api/draw").toBe(1);
    expect.soft(await historyCount(request), "ประวัติหลังดับเบิลคลิก").toBe(1);

    // five quick Enter presses on the focused button
    posts = 0;
    const before = await historyCount(request);
    first = page.waitForResponse(isDraw);
    await page.getByRole("button", { name: DRAW_BUTTON }).focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("Enter");
    await settleDraw(page, first);
    expect(posts, "กด Enter 5 ครั้ง → POST /api/draw").toBe(1);
    expect(await historyCount(request), "ประวัติเพิ่ม 1 แถว").toBe(before + 1);
  });

  test("TC-DRAW-08 โทษกินแล้วยังอยู่หลังสุ่มเพิ่ม 1,000 ครั้ง @P2", async ({ request }) => {
    test.setTimeout(240_000);
    const d = await (await request.post("/api/draw", { data: {} })).json();
    expect((await request.patch(`/api/draws/${d.id}`, { data: { eaten: true } })).ok()).toBeTruthy();
    const eatenAt = (await restaurant(request, d.restaurantId)).lastEatenAt;
    expect(eatenAt, "กินแล้ว → มี lastEatenAt").toBeTruthy();

    // 1,000 more draws, 50 at a time
    const N = 1000;
    for (let i = 0; i < N; i += 50) {
      const batch = await Promise.all(
        Array.from({ length: Math.min(50, N - i) }, () => request.post("/api/draw", { data: {} })),
      );
      for (const res of batch) expect(res.status()).toBe(201);
    }

    // BR-06/BR-25: the ×0.2 penalty lasts 7 days, however many draws happen meanwhile
    expect((await restaurant(request, d.restaurantId)).lastEatenAt, `ร้าน #${d.restaurantId} ยังมี lastEatenAt`).toBe(eatenAt);
  });
});

test.describe("หน้าแรก", () => {
  test("TC-HOME-05 โหวตใน localStorage ผิดช่วง: % บนกระดาน = การ์ดผล = server @P3", async ({ page }) => {
    // a stored solo vote outside -1..+1 (old version, hand edit)
    await page.addInitScript(() =>
      localStorage.setItem("lunch-draw:solo", JSON.stringify({ votes: { noodle: 5 }, lazy: false, prices: [] })),
    );
    // the server clamps the vote to +1 → every noodle place ×1.5, everyone else ×1 (04_TEST-DATA S02)
    const noodle = SEED.filter((r) => r.categories.includes("noodle"));
    const expected = pct(1.5 / (noodle.length * 1.5 + (TOTAL - noodle.length)));
    const top = Math.min(...noodle.map((r) => r.number)); // ties sort by number, so this one is listed first

    await openHome(page);
    await expect.poll(() => rowPercent(page, top), `กระดาน: ร้านเส้น #${top}`).toBe(expected);

    // the result card and the board show the server's own probability
    const resp = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/draw" && r.request().method() === "POST");
    await page.getByRole("button", { name: DRAW_BUTTON }).click();
    const d = await (await resp).json();
    const card = page.getByTestId("winner");
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card).toContainText(`มีโอกาส ${pct(d.probability)}`);
    const showAll = page.getByRole("button", { name: /^แสดงทั้งหมด/ });
    if (await showAll.isVisible()) await showAll.click();
    await expect(row(page, d.restaurantId)).toBeVisible();
    await expect.poll(() => rowPercent(page, d.restaurantId), `กระดาน: ร้านที่สุ่มได้ #${d.restaurantId}`).toBe(pct(d.probability));
    await expect.poll(() => rowPercent(page, top), `กระดาน: ร้านเส้น #${top} หลังสุ่ม`).toBe(expected);
  });
});

test.describe("API", () => {
  test("TC-API-07 /api/draw รับ input ผิด ได้ 400 และไม่บันทึกผล @P3", async ({ request }) => {
    const cases: { label: string; data: unknown }[] = [
      { label: "body ไม่ใช่ JSON", data: "this is not json{" },
      { label: 'lazy:"false"', data: { lazy: "false" } },
      { label: "prices:[9]", data: { prices: [9] } },
      { label: "scores:{noodle:0.5}", data: { scores: { noodle: 0.5 } } },
    ];
    for (const c of cases) {
      const res = await request.post("/api/draw", { headers: { "Content-Type": "application/json" }, data: c.data });
      expect.soft(res.status(), c.label).toBe(400);
    }
    expect(await historyCount(request), "ไม่มีผลสุ่มถูกบันทึก").toBe(0);

    // a valid request still works and is recorded (the counter above is real)
    expect((await request.post("/api/draw", { data: {} })).status()).toBe(201);
    expect(await historyCount(request)).toBe(1);
  });

  test('TC-API-08 ค่าผิดชนิด (null, "", true, "0x2", [2]) ได้ 400 @P3', async ({ request }) => {
    // rating score
    const rater = "e2e-type-rater-01";
    expect((await request.put("/api/restaurants/1/rating", { data: { rater, score: 3 } })).status()).toBe(200);
    for (const score of [null, ""]) {
      const res = await request.put("/api/restaurants/1/rating", { data: { rater, score } });
      expect.soft(res.status(), `rating score ${JSON.stringify(score)}`).toBe(400);
    }
    const r1 = await restaurant(request, 1);
    expect.soft(r1.ratingCount, "คะแนนเดิมยังอยู่").toBe(1);
    expect.soft(r1.ratingAvg).toBe(3);

    // restaurant base weight
    for (const baseWeight of ["0x2", true, [2]]) {
      const res = await request.patch("/api/restaurants/2", { data: { baseWeight } });
      expect.soft(res.status(), `baseWeight ${JSON.stringify(baseWeight)}`).toBe(400);
    }
    expect.soft((await restaurant(request, 2)).baseWeight, "baseWeight เดิมไม่เปลี่ยน").toBe(1);

    // room vote value
    const { code } = await (await request.post("/api/rooms", { data: {} })).json();
    const m = await (await request.post(`/api/rooms/${code}/members`, { data: { nickname: "ต้น" } })).json();
    expect((await request.put(`/api/rooms/${code}/votes`, { data: { memberId: m.id, categoryId: "noodle", value: 1 } })).status()).toBe(200);
    for (const value of ["", null]) {
      const res = await request.put(`/api/rooms/${code}/votes`, { data: { memberId: m.id, categoryId: "noodle", value } });
      expect.soft(res.status(), `vote value ${JSON.stringify(value)}`).toBe(400);
    }
    const room = await (await request.get(`/api/rooms/${code}`)).json();
    expect(room.scores?.noodle, "โหวตเดิมยังอยู่").toBe(1);
  });

  test("TC-API-09 id ใน path แปลก (0x10, 1e1) ได้ 400 @P3", async ({ request }) => {
    for (const [path, target] of [["0x10", 16], ["1e1", 10]] as const) {
      const res = await request.patch(`/api/restaurants/${path}`, { data: { nickname: `e2e-${path}` } });
      expect.soft(res.status(), `PATCH /api/restaurants/${path}`).toBe(400);
      expect.soft((await restaurant(request, target)).nickname, `ร้าน #${target} ไม่ถูกแก้`).toBeNull();
    }
  });

  test("TC-API-10 POST text/plain จาก origin อื่นถูกปฏิเสธ @P3", async ({ request }) => {
    const res = await request.post("/api/draw", {
      headers: { "Content-Type": "text/plain", Origin: "https://evil.example" },
      data: "{}",
    });
    expect.soft(res.status(), "ต้องถูกปฏิเสธด้วย 4xx").toBeGreaterThanOrEqual(400);
    expect.soft(res.status(), "ต้องถูกปฏิเสธด้วย 4xx").toBeLessThan(500);
    expect(await historyCount(request), "ไม่มีผลสุ่มถูกบันทึก").toBe(0);
  });

  test("TC-API-11 GET /api/restaurants ไม่เปิดเผย rater id ของคนอื่น @P3", async ({ request }) => {
    const rater = "e2e-secret-rater-7f3a9c";
    expect((await request.put("/api/restaurants/1/rating", { data: { rater, score: 4 } })).status()).toBe(200);
    const res = await request.get("/api/restaurants");
    const body = await res.text();
    // the rating is there (average and count are public) ...
    const r1 = JSON.parse(body).restaurants.find((r: { number: number }) => r.number === 1);
    expect(r1.ratingCount).toBe(1);
    // ... but not the id that lets anyone change it
    expect(body.includes(rater), "rater id อยู่ใน response").toBe(false);
  });
});

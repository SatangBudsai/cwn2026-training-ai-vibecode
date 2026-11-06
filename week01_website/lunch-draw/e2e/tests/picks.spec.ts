import { TOTAL, createRoom, expect, joinRoom, newMember, openHome, pct, row, rowPercent, test, topRowNumber } from "../fixtures";

const LIVE = { timeout: 3_000 };
const up = (n: number) => `[data-testid="odds-row"][data-number="${n}"] button[aria-label^="อยากไปร้าน"]`;
const down = (n: number) => `[data-testid="odds-row"][data-number="${n}"] button[aria-label^="ไม่อยากไปร้าน"]`;

test.describe("โหวตร้าน", () => {
  test("TC-VOTE-06 โหวต + ร้าน ร้านนั้นมีโอกาสมากขึ้น @P1", async ({ page }) => {
    await openHome(page);
    await page.locator(up(5)).click();
    await expect(row(page, 5).getByTestId("vote-net")).toHaveText("+1");
    expect(await topRowNumber(page)).toBe(5);
    // ×1.5 for this place, ×1 for the other 236
    await expect.poll(() => rowPercent(page, 5)).toBe(pct(1.5 / (TOTAL - 1 + 1.5)));
  });

  test("TC-VOTE-07 โหวต − ร้าน แล้วกดซ้ำเพื่อยกเลิก @P2", async ({ page }) => {
    await openHome(page);
    await page.locator(down(1)).click();
    await expect(page.locator(`[data-testid="odds-row"][data-number="1"]`)).toHaveCount(0); // dropped out of the top 15
    await page.getByRole("button", { name: /^แสดงทั้งหมด/ }).click();
    await expect(row(page, 1).getByTestId("vote-net")).toHaveText("-1");
    expect(await rowPercent(page, 1)).toBe(pct(0.5 / (TOTAL - 1 + 0.5)));
    await page.locator(down(1)).click();
    await expect(row(page, 1).getByTestId("vote-net")).toHaveText("0");
    expect(await rowPercent(page, 1)).toBe(pct(1 / TOTAL));
  });

  test("TC-VOTE-08 โหวตร้านรวมกับโหวตแนวอาหาร @P2", async ({ page }) => {
    // restaurant #5 is a noodle place: noodle +1 (×1.5) and the place itself +1 (×1.5) -> ×2.25
    await openHome(page);
    await page.getByRole("button", { name: "อยากกินก๋วยเตี๋ยว / เส้น", exact: true }).click();
    await page.locator(up(5)).click();
    expect(await topRowNumber(page)).toBe(5);
    await expect(row(page, 5).getByTestId("vote-net")).toHaveText("+1");
  });

  test("TC-ROOM-09 สมาชิกโหวตร้านในห้องแบบ realtime @P1", async ({ page, browser }) => {
    const url = await createRoom(page, "ต้น");
    const b = await newMember(browser);
    await joinRoom(b, url, "มิว");

    await page.locator(up(5)).click();
    await expect(b.locator(`[data-testid="odds-row"][data-number="5"]`).getByTestId("vote-net")).toHaveText("+1", LIVE);
    await b.locator(up(5)).click();
    await expect(row(page, 5).getByTestId("vote-net")).toHaveText("+2", LIVE);
    // ×2 for this place
    await expect.poll(() => rowPercent(page, 5), LIVE).toBe(pct(2 / (TOTAL + 1)));

    const res = await page.request.post("/api/draw", { data: { roomCode: url.split("/").pop() } });
    expect(res.status()).toBe(201);
    await b.context().close();
  });

  test("TC-API-06 โหวตร้านที่ไม่มีอยู่ ได้ 400 @P2", async ({ request }) => {
    const { code } = await (await request.post("/api/rooms", { data: {} })).json();
    const m = await (await request.post(`/api/rooms/${code}/members`, { data: { nickname: "ต้น" } })).json();
    const bad = await request.put(`/api/rooms/${code}/votes`, { data: { memberId: m.id, restaurantId: 99999, value: 1 } });
    expect(bad.status()).toBe(400);
    const ok = await request.put(`/api/rooms/${code}/votes`, { data: { memberId: m.id, restaurantId: 5, value: 1 } });
    expect(ok.status()).toBe(200);
    expect((await ok.json()).restaurantScores).toEqual({ 5: 1 });
  });
});

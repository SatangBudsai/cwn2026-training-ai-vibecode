import {
  TOTAL,
  catSwitch,
  vote,
  chosen,
  createRoom,
  expect,
  joinRoom,
  newMember,
  openHome,
  pct,
  placeSwitch,
  row,
  rowPercent,
  test,
  topRowNumber,
} from "../fixtures";

const LIVE = { timeout: 3_000 };

test.describe("โหวตร้าน", () => {
  test("TC-VOTE-06 เห็นด้วยกับร้าน ร้านนั้นมีโอกาสมากขึ้น @P1", async ({ page }) => {
    await openHome(page);
    await vote(placeSwitch(page, 5), "เห็นด้วย");
    await expect(chosen(placeSwitch(page, 5))).toHaveText("เห็นด้วย");
    await expect(row(page, 5).getByTestId("vote-net")).toHaveCount(0); // the group total is for rooms only
    expect(await topRowNumber(page)).toBe(5);
    // ×1.5 for this place, ×1 for the other 236
    await expect.poll(() => rowPercent(page, 5)).toBe(pct(1.5 / (TOTAL - 1 + 1.5)));
  });

  test("TC-VOTE-07 ไม่เห็นด้วยกับร้าน แล้วกลับมาเลือก ปกติ @P2", async ({ page }) => {
    await openHome(page);
    await vote(placeSwitch(page, 1), "ไม่เห็นด้วย");
    await expect(page.locator(`[data-testid="odds-row"][data-number="1"]`)).toHaveCount(0); // dropped out of the top 15
    await page.getByRole("button", { name: /^แสดงทั้งหมด/ }).click();
    await expect(chosen(placeSwitch(page, 1))).toHaveText("ไม่เห็นด้วย");
    expect(await rowPercent(page, 1)).toBe(pct(0.5 / (TOTAL - 1 + 0.5)));
    await vote(placeSwitch(page, 1), "ปกติ");
    await expect(chosen(placeSwitch(page, 1))).toHaveText("ปกติ");
    expect(await rowPercent(page, 1)).toBe(pct(1 / TOTAL));
  });

  test("TC-VOTE-08 โหวตร้านรวมกับโหวตประเภทอาหาร @P2", async ({ page }) => {
    // restaurant #5 is a noodle place: noodle +1 (×1.5) and the place itself +1 (×1.5) -> ×2.25
    await openHome(page);
    await vote(catSwitch(page, "ก๋วยเตี๋ยว / เมนูเส้น"), "เห็นด้วย");
    await vote(placeSwitch(page, 5), "เห็นด้วย");
    expect(await topRowNumber(page)).toBe(5);
    await expect(chosen(placeSwitch(page, 5))).toHaveText("เห็นด้วย");
  });

  test("TC-ROOM-09 สมาชิกโหวตร้านในห้องแบบ realtime @P1", async ({ page, browser }) => {
    const url = await createRoom(page, "ต้น");
    const b = await newMember(browser);
    await joinRoom(b, url, "มิว");

    await vote(placeSwitch(page, 5), "เห็นด้วย");
    await expect(b.locator(`[data-testid="odds-row"][data-number="5"]`).getByTestId("vote-net")).toHaveText("รวม +1", LIVE);
    await vote(placeSwitch(b, 5), "เห็นด้วย");
    await expect(row(page, 5).getByTestId("vote-net")).toHaveText("รวม +2", LIVE);
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

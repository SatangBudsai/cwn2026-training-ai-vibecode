import { LAZY_TOTAL, createRoom, draw, expect, joinRoom, newMember, openHome, row, test } from "../fixtures";

// realtime: everything below must show up on the other screen without a reload
const LIVE = { timeout: 3_000 };

test.describe("ห้อง (member) และ realtime", () => {
  test("TC-ROOM-01 เปิดห้องแล้วต้องใส่ชื่อเล่นก่อนโหวต @P1", async ({ page }) => {
    // real flow: button on the home page -> join form -> room
    await openHome(page);
    await page.getByRole("button", { name: "เปิดห้อง" }).click();
    await page.waitForURL(/\/room\/[A-Z2-9]{4}$/);
    const code = page.url().split("/").pop()!;
    await expect(page.getByRole("heading", { name: "ใส่ชื่อเล่นเพื่อโหวต" })).toBeVisible();
    await expect(page.getByRole("button", { name: "เข้าห้อง" })).toBeDisabled(); // empty nickname
    await page.getByLabel("ชื่อเล่น").fill("ต้น");
    await page.getByRole("button", { name: "เข้าห้อง" }).click();
    await expect(page.getByRole("heading", { name: `ห้อง ${code}` })).toBeVisible();
    await expect(page.getByTestId("vote-status").filter({ visible: true })).toHaveText("1 คนในห้อง · คุณคือ ต้น");
  });

  test("TC-ROOM-02 สมาชิกคนที่สองเข้าห้องผ่านลิงก์ คนแรกเห็นทันที @P1", async ({ page, browser }) => {
    const url = await createRoom(page, "ต้น");
    const b = await newMember(browser);
    await joinRoom(b, url, "มิว");
    await expect(page.getByTestId("vote-status")).toContainText("2 คนในห้อง", LIVE);
    await b.context().close();
  });

  test("TC-ROOM-03 โหวตของทุกคนรวมกันแบบ realtime @P1", async ({ page, browser }) => {
    const url = await createRoom(page, "ต้น");
    const b = await newMember(browser);
    await joinRoom(b, url, "มิว");

    await page.getByRole("button", { name: "อยากกินส้มตำ / อีสาน", exact: true }).click();
    await expect(b.getByTestId("cat-isan").getByTestId("vote-net")).toHaveText("+1", LIVE);
    await b.getByRole("button", { name: "อยากกินส้มตำ / อีสาน", exact: true }).click();
    await expect(page.getByTestId("cat-isan").getByTestId("vote-net")).toHaveText("+2", LIVE);
    await expect(page.getByTestId("cat-isan")).toContainText("×2.0");
    await b.context().close();
  });

  test("TC-ROOM-04 ตัวกรองของห้องใช้ร่วมกันทุกคน @P2", async ({ page, browser }) => {
    const url = await createRoom(page, "ต้น");
    const b = await newMember(browser);
    await joinRoom(b, url, "มิว");

    await b.getByRole("switch").check({ force: true });
    await expect(page.getByTestId("pool-count")).toHaveText(String(LAZY_TOTAL), LIVE);
    await expect(page.getByRole("switch")).toBeChecked();

    await b.locator("fieldset").getByRole("button", { name: "ไม่ระบุ", exact: true }).click();
    await expect(page.getByText("กรองราคา")).toBeVisible(LIVE);
    await b.context().close();
  });

  test("TC-ROOM-05 จับสลากในห้อง ทุกคนเห็นร้านเดียวกัน @P1", async ({ page, browser }) => {
    const url = await createRoom(page, "ต้น");
    const b = await newMember(browser);
    await joinRoom(b, url, "มิว");

    const n = await draw(page);
    await expect(b.getByTestId("winner")).toBeVisible({ timeout: 10_000 });
    await expect(b.getByTestId("winner")).toHaveAttribute("data-number", String(n));
    await b.context().close();
  });

  test("TC-ROOM-06 สมาชิกเห็นการแก้ข้อมูลร้านทันที @P2", async ({ page, browser }) => {
    const url = await createRoom(page, "ต้น");
    const b = await newMember(browser);
    await joinRoom(b, url, "มิว");

    const res = await page.request.patch("/api/restaurants/1", { data: { nickname: "ร้านประจำ" } });
    expect(res.ok()).toBeTruthy();
    await expect(b.getByTestId("odds-row").filter({ hasText: "ร้านประจำ" })).toHaveCount(1, LIVE);
    await expect(row(page, 1).getByTestId("odds-name")).toHaveText("ร้านประจำ", LIVE);
    await b.context().close();
  });

  test("TC-ROOM-07 ใช้ชื่อเล่นซ้ำในห้อง คือคนเดิม @P3", async ({ request }) => {
    const { code } = await (await request.post("/api/rooms", { data: {} })).json();
    const a = await (await request.post(`/api/rooms/${code}/members`, { data: { nickname: "ต้น" } })).json();
    const again = await (await request.post(`/api/rooms/${code}/members`, { data: { nickname: "ต้น" } })).json();
    expect(again.id).toBe(a.id);
    const state = await (await request.get(`/api/rooms/${code}`)).json();
    expect(state.members).toHaveLength(1);
  });

  test("TC-ROOM-08 ห้องที่ไม่มีอยู่ @P3", async ({ page, request }) => {
    expect((await request.get("/api/rooms/ZZZZ")).status()).toBe(404);
    await page.goto("/room/ZZZZ");
    await expect(page.getByText(/404|could not be found/i).first()).toBeVisible();
  });
});

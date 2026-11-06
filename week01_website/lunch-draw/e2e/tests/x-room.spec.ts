import { expect, joinRoom, newMember, test } from "../fixtures";
import type { APIRequestContext, Browser, Page } from "@playwright/test";

// New cases from exploration (EXP-01, EXP-06, EXP-07, EXP-21).
// They assert the CORRECT behaviour, so they fail until the bugs are fixed.

type RoomJson = {
  code: string;
  scores: Record<string, number>;
  latestDraw: { id: string; restaurantId: number } | null;
};

const LIVE = { timeout: 3_000 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function newRoomCode(request: APIRequestContext) {
  const res = await request.post("/api/rooms", { data: {} });
  expect(res.ok(), "create room").toBeTruthy();
  return ((await res.json()) as { code: string }).code;
}

async function roomState(request: APIRequestContext, code: string): Promise<RoomJson> {
  const res = await request.get(`/api/rooms/${code}`);
  expect(res.ok(), `GET room ${code}`).toBeTruthy();
  return res.json();
}

/** Members on their own browser profiles; the caller closes them */
async function members(browser: Browser, code: string, nicknames: string[]) {
  // newMember() opens a context without baseURL, so give joinRoom the full link
  const base = test.info().project.use.baseURL;
  const pages: Page[] = [];
  for (const nick of nicknames) {
    const p = await newMember(browser);
    await joinRoom(p, new URL(`/room/${code}`, base).toString(), nick);
    pages.push(p);
  }
  return pages;
}

/** Click the draw button from inside the page so two pages can press at the same instant */
const pressDraw = (p: Page) =>
  p.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      /^(สุ่มร้าน|สุ่มใหม่)$/.test((b.textContent ?? "").trim()),
    );
    if (!btn) throw new Error("draw button not found");
    btn.click();
  });

const winnerNumber = (p: Page) =>
  p.getByTestId("winner").getAttribute("data-number", { timeout: 1_000 }).catch(() => "none");

/** Net vote shown on this screen for each category */
async function shownNets(p: Page, ids: string[]) {
  const out: Record<string, number> = {};
  for (const id of ids) {
    const text = (await p.getByTestId(`cat-${id}`).getByTestId("vote-net").textContent()) ?? "";
    out[id] = Number(text.match(/[-+]?\d+/)?.[0] ?? NaN); // "รวม +1" -> 1
  }
  return out;
}

const VOTE_CATS = ["noodle", "rice-curry"];
// the "เห็นด้วย" option of a category's three-way switch
const upButton = (p: Page, cat: string) =>
  p.getByTestId(`cat-${cat}`).getByRole("radio", { name: "เห็นด้วย", exact: true });
const ROOM_GONE_TEXT = /หมดอายุ|ไม่สำเร็จ|ไม่พบห้อง|ไม่มีห้อง|ห้องนี้ไม่มี|ไม่มีอยู่/;

test.describe("ห้อง (member) · จากการสำรวจ", () => {
  test("TC-ROOM-10 สองคนกดสุ่มพร้อมกัน ทุกจอแสดงร้านเดียวกับผลล่าสุดของห้อง @P1", async ({ browser, request }) => {
    test.setTimeout(150_000);
    const code = await newRoomCode(request);
    const [a, b, c] = await members(browser, code, ["เอ", "บี", "ซี"]);
    const mismatches: string[] = [];
    try {
      for (let round = 1; round <= 3; round++) {
        const before = (await roomState(request, code)).latestDraw?.id ?? null;
        // A and B press at the same moment (neither has seen the other's SSE yet)
        await Promise.all([pressDraw(a), pressDraw(b)]);
        // both draws reached the server -> latestDraw changed
        await expect
          .poll(async () => (await roomState(request, code)).latestDraw?.id ?? null, { timeout: 10_000 })
          .not.toBe(before);
        // let both reveal animations (≈3 s each) and every SSE event finish
        await sleep(6_000);
        const latest = (await roomState(request, code)).latestDraw!;
        const want = String(latest.restaurantId);
        // give a correct app a little extra time to converge, then read every screen
        await expect
          .poll(async () => (await Promise.all([a, b, c].map(winnerNumber))).every((n) => n === want), { timeout: 3_000 })
          .toBe(true)
          .catch(() => undefined);
        const shown = await Promise.all([a, b, c].map(winnerNumber));
        if (shown.some((n) => n !== want))
          mismatches.push(`รอบ ${round}: latestDraw #${want} | A #${shown[0]} | B #${shown[1]} | C #${shown[2]}`);
      }
      expect(mismatches, "ทุกจอต้องแสดง latestDraw ของห้องทุกรอบ").toEqual([]);
    } finally {
      for (const p of [a, b, c]) await p.context().close();
    }
  });

  test("TC-ROOM-11 response ของโหวตที่มาช้าไม่ทับโหวตที่ใหม่กว่า @P2", async ({ browser, request }) => {
    const code = await newRoomCode(request);
    const [a, b] = await members(browser, code, ["เอ", "บี"]);
    try {
      // A is on a slow connection: the server handles the vote at once, the reply arrives 1.5 s later
      await a.route("**/api/rooms/*/votes", async (route) => {
        const resp = await route.fetch();
        await sleep(1_500);
        await route.fulfill({ response: resp });
      });
      const aReply = a.waitForResponse((r) => r.url().includes("/votes") && r.request().method() === "PUT");
      await upButton(a, "noodle").click();
      await a.getByTestId("vote-savebar").getByRole("button", { name: "บันทึกโหวต" }).click();
      await sleep(300);
      await upButton(b, "rice-curry").click();
      await b.getByTestId("vote-savebar").getByRole("button", { name: "บันทึกโหวต" }).click();
      // B's vote reaches A in realtime before A's slow reply comes back
      await expect(a.getByTestId("cat-rice-curry").getByTestId("vote-net")).toHaveText("รวม +1", LIVE);
      await aReply;

      const server = (await roomState(request, code)).scores;
      expect(server, "server ได้ทั้งสองโหวต").toMatchObject({ noodle: 1, "rice-curry": 1 });
      const want = Object.fromEntries(VOTE_CATS.map((id) => [id, server[id] ?? 0]));
      // after the slow reply, A's screen must still match the server
      await sleep(500);
      await expect.poll(() => shownNets(a, VOTE_CATS), LIVE).toEqual(want);
    } finally {
      for (const p of [a, b]) await p.context().close();
    }
  });

  test("TC-ROOM-12 โหวตหลังห้องถูกลบ แสดงข้อความและไม่ค้างสถานะกดแล้ว @P2", async ({ browser, request }) => {
    const code = await newRoomCode(request);
    const [a] = await members(browser, code, ["เอ"]);
    try {
      await expect(a.locator("body")).not.toContainText(ROOM_GONE_TEXT);
      // the room is gone (expired / deleted): the vote request gets 404 like the real API
      await a.route("**/api/rooms/*/votes", (route) =>
        route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "ไม่พบห้อง" }) }),
      );
      const put = a.waitForResponse((r) => r.url().includes("/votes") && r.request().method() === "PUT");
      await upButton(a, "noodle").click();
      await a.getByTestId("vote-savebar").getByRole("button", { name: "บันทึกโหวต" }).click();
      expect((await put).status()).toBe(404);

      // the person is told the vote did not go through
      await expect(a.locator("body"), "ต้องแจ้งว่าโหวตไม่สำเร็จ / ห้องหมดอายุ").toContainText(ROOM_GONE_TEXT, LIVE);
      // and the vote is not left looking accepted (unless the app moved to a "room gone" page)
      if (await upButton(a, "noodle").count()) {
        await expect(upButton(a, "noodle"), "สวิตช์ต้องไม่ค้างที่ เห็นด้วย").toHaveAttribute("aria-checked", "false");
        await expect(a.getByTestId("cat-noodle").getByTestId("vote-net")).toHaveText("รวม 0");
      }
    } finally {
      await a.context().close();
    }
  });

  test("TC-ROOM-13 เปิด /room/ZZZZ ได้ HTTP 404 @P3", async ({ page, request }) => {
    expect((await request.get("/api/rooms/ZZZZ")).status(), "API ยืนยันว่าห้องไม่มีอยู่").toBe(404);
    const res = await page.goto("/room/ZZZZ");
    expect(res, "มี response ของหน้า").not.toBeNull();
    expect(res!.status(), "หน้าห้องที่ไม่มีอยู่ต้องตอบ HTTP 404").toBe(404);
  });
});

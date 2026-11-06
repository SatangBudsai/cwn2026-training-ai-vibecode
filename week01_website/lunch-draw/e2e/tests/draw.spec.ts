import { SEED, TOTAL, byNumber, draw, expect, openHome, pct, row, rowPercent, setRestaurant, showAll, test, walk } from "../fixtures";

test.describe("จับสลาก", () => {
  test("TC-DRAW-01 จับสลากแล้วได้การ์ดผลพร้อมลิงก์ Google Maps @P1", async ({ page }) => {
    await openHome(page);
    const n = await draw(page);
    const r = byNumber.get(n)!;
    const card = page.getByTestId("winner");
    await expect(card.getByRole("heading", { level: 2 })).toHaveText(r.name);
    await expect(card).toContainText(/ม\.|กม\./);
    await expect(card).toContainText("นาที");
    const maps = card.getByRole("link", { name: /Google Maps/ });
    await expect(maps).toHaveAttribute("href", new RegExp(`google\\.com/maps/search/.*${r.lat}`));
    const walkLink = card.getByRole("link", { name: /นำทางเดิน/ });
    await expect(walkLink).toHaveAttribute("href", /travelmode=walking/);
    await expect(page.getByRole("button", { name: "จับสลากใหม่" })).toBeVisible();
  });

  test("TC-DRAW-02 ผลจับสลากเป็นไปตามโหมดขี้เกียจเดินเสมอ @P1", async ({ request }) => {
    for (let i = 0; i < 25; i++) {
      const res = await request.post("/api/draw", { data: { lazy: true } });
      expect(res.status()).toBe(201);
      const d = await res.json();
      expect(walk(byNumber.get(d.restaurantId)!)).toBeLessThanOrEqual(500);
    }
  });

  test("TC-DRAW-03 ร้านที่ปิดไว้ไม่ถูกสุ่ม @P1", async ({ page }) => {
    // close every lazy-mode place except one: that one must always win
    const lazy = SEED.filter((r) => walk(r) <= 500);
    const keep = lazy[0].number;
    for (const r of lazy.slice(1)) await setRestaurant(page, r.number, { disabled: true });
    for (let i = 0; i < 10; i++) {
      const d = await (await page.request.post("/api/draw", { data: { lazy: true } })).json();
      expect(d.restaurantId).toBe(keep);
      expect(d.probability).toBe(1);
    }
  });

  test("TC-DRAW-04 กด ไปกินร้านนี้ แล้วโอกาสร้านนั้นลดลง @P1", async ({ page }) => {
    await openHome(page);
    const n = await draw(page);
    await page.getByRole("button", { name: "ไปกินร้านนี้" }).click();
    await expect(page.getByRole("button", { name: /บันทึกว่ากินร้านนี้แล้ว/ })).toBeVisible();

    await showAll(page);
    await expect(row(page, n)).toContainText("กินไปเมื่อวันนี้");
    await expect(row(page, n)).toContainText("×0.2");
    // eaten today: weight 0.2, everyone else 1
    await expect.poll(() => rowPercent(page, n)).toBe(pct(0.2 / (TOTAL - 1 + 0.2)));
  });

  test("TC-DRAW-05 ยกเลิก กินแล้ว โอกาสกลับเป็นปกติ @P2", async ({ page }) => {
    await openHome(page);
    const n = await draw(page);
    await page.getByRole("button", { name: "ไปกินร้านนี้" }).click();
    await page.getByRole("button", { name: /บันทึกว่ากินร้านนี้แล้ว/ }).click();
    await expect(page.getByRole("button", { name: "ไปกินร้านนี้" })).toBeVisible();
    await showAll(page);
    await expect.poll(() => rowPercent(page, n)).toBe(pct(1 / TOTAL));
    await expect(row(page, n)).not.toContainText("กินไปเมื่อ");
  });

  test("TC-DRAW-06 กินแล้วยังถูกนับหลังรีโหลด @P2", async ({ page }) => {
    await openHome(page);
    const n = await draw(page);
    await page.getByRole("button", { name: "ไปกินร้านนี้" }).click();
    await expect(page.getByRole("button", { name: /บันทึกว่ากินร้านนี้แล้ว/ })).toBeVisible();
    await page.reload();
    await showAll(page);
    await expect(row(page, n)).toContainText("กินไปเมื่อวันนี้");
  });
});

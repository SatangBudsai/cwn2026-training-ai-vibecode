import { SEED, byNumber, expect, openHome, pct, row, rowPercent, showAll, test, topRowNumber } from "../fixtures";

const has = (cat: string) => SEED.filter((r) => r.categories.includes(cat));

test.describe("โหวตแนวอาหาร (คนเดียว)", () => {
  test("TC-VOTE-01 โหวต + ก๋วยเตี๋ยว ร้านก๋วยเตี๋ยวมีโอกาสมากขึ้น @P1", async ({ page }) => {
    await openHome(page);
    await page.getByRole("button", { name: "อยากกินก๋วยเตี๋ยว / เส้น", exact: true }).click();

    const cat = page.getByTestId("cat-noodle");
    await expect(cat.getByTestId("cat-net")).toHaveText("+1");
    await expect(cat).toContainText("×1.5");

    // weight 1.5 for noodle places, 1 for the rest
    const n = has("noodle").length;
    const expected = pct(1.5 / (n * 1.5 + (SEED.length - n)));
    const top = await topRowNumber(page);
    expect(byNumber.get(top)!.categories).toContain("noodle");
    expect(await rowPercent(page, top)).toBe(expected);
  });

  test("TC-VOTE-02 โหวต − ฝรั่ง ร้านฝรั่งมีโอกาสน้อยลง @P2", async ({ page }) => {
    await openHome(page);
    await page.getByRole("button", { name: "ไม่อยากกินฝรั่ง", exact: true }).click();

    const cat = page.getByTestId("cat-western");
    await expect(cat.getByTestId("cat-net")).toHaveText("-1");
    await expect(cat).toContainText("×0.5");

    const westernOnly = SEED.find((r) => r.categories.length === 1 && r.categories[0] === "western")!;
    const n = has("western").filter((r) => r.categories.length === 1).length;
    const total = n * 0.5 + (SEED.length - n);
    await showAll(page);
    expect(await rowPercent(page, westernOnly.number)).toBe(pct(0.5 / total));
  });

  test("TC-VOTE-03 กดโหวตซ้ำเพื่อยกเลิก @P3", async ({ page }) => {
    await openHome(page);
    const plus = page.getByRole("button", { name: "อยากกินส้มตำ / อีสาน", exact: true });
    await plus.click();
    await expect(page.getByTestId("cat-isan").getByTestId("cat-net")).toHaveText("+1");
    await plus.click();
    await expect(page.getByTestId("cat-isan").getByTestId("cat-net")).toHaveText("0");
    await expect(page.getByTestId("cat-isan")).toContainText("×1.0");
  });

  test("TC-VOTE-04 โหวตยังอยู่หลังรีโหลด @P3", async ({ page }) => {
    await openHome(page);
    await page.getByRole("button", { name: "อยากกินญี่ปุ่น", exact: true }).click();
    await expect(page.getByTestId("cat-japanese").getByTestId("cat-net")).toHaveText("+1");
    await page.reload();
    await expect(page.getByTestId("cat-japanese").getByTestId("cat-net")).toHaveText("+1");
    const top = await topRowNumber(page);
    expect(byNumber.get(top)!.categories).toContain("japanese");
  });

  test("TC-VOTE-05 ร้านหลายแนวได้ตัวคูณของแนวที่ดีที่สุด @P2", async ({ page }) => {
    // a place serving both noodle and isan: noodle −1 and isan +1 -> takes ×1.5, not ×0.5
    const both = SEED.find((r) => r.categories.includes("noodle") && r.categories.includes("isan"));
    test.skip(!both, "no restaurant has both categories in the data");
    await openHome(page);
    await page.getByRole("button", { name: "ไม่อยากกินก๋วยเตี๋ยว / เส้น", exact: true }).click();
    await page.getByRole("button", { name: "อยากกินส้มตำ / อีสาน", exact: true }).click();
    const weight = (r: (typeof SEED)[number]) =>
      Math.max(...r.categories.map((c) => (c === "noodle" ? 0.5 : c === "isan" ? 1.5 : 1)));
    const total = SEED.reduce((s, r) => s + weight(r), 0);
    await showAll(page);
    await expect(row(page, both!.number)).toBeVisible();
    expect(await rowPercent(page, both!.number)).toBe(pct(1.5 / total));
  });
});

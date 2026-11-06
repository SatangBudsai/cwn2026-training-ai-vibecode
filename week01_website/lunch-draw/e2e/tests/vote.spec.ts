import { SEED, byNumber, catSwitch, vote, chosen, expect, openHome, pct, row, rowPercent, showAll, test, topRowNumber } from "../fixtures";

const has = (cat: string) => SEED.filter((r) => r.categories.includes(cat));

test.describe("โหวตประเภทอาหาร (คนเดียว)", () => {
  test("TC-VOTE-01 เห็นด้วยกับก๋วยเตี๋ยว / เมนูเส้น ร้านก๋วยเตี๋ยวมีโอกาสมากขึ้น @P1", async ({ page }) => {
    await openHome(page);
    await vote(catSwitch(page, "ก๋วยเตี๋ยว / เมนูเส้น"), "เห็นด้วย");

    const cat = page.getByTestId("cat-noodle");
    await expect(chosen(catSwitch(page, "ก๋วยเตี๋ยว / เมนูเส้น"))).toHaveText("เห็นด้วย");
    await expect(cat).toContainText("×1.5");

    // weight 1.5 for noodle places, 1 for the rest
    const n = has("noodle").length;
    const expected = pct(1.5 / (n * 1.5 + (SEED.length - n)));
    const top = await topRowNumber(page);
    expect(byNumber.get(top)!.categories).toContain("noodle");
    expect(await rowPercent(page, top)).toBe(expected);
  });

  test("TC-VOTE-02 ไม่เห็นด้วยกับอาหารตะวันตก ร้านอาหารตะวันตกมีโอกาสน้อยลง @P2", async ({ page }) => {
    await openHome(page);
    await vote(catSwitch(page, "อาหารตะวันตก"), "ไม่เห็นด้วย");

    const cat = page.getByTestId("cat-western");
    await expect(chosen(catSwitch(page, "อาหารตะวันตก"))).toHaveText("ไม่เห็นด้วย");
    await expect(cat).toContainText("×0.5");

    const westernOnly = SEED.find((r) => r.categories.length === 1 && r.categories[0] === "western")!;
    const n = has("western").filter((r) => r.categories.length === 1).length;
    const total = n * 0.5 + (SEED.length - n);
    await showAll(page);
    expect(await rowPercent(page, westernOnly.number)).toBe(pct(0.5 / total));
  });

  test("TC-VOTE-03 กลับมาเลือก ปกติ เพื่อยกเลิกโหวต @P3", async ({ page }) => {
    await openHome(page);
    const sw = catSwitch(page, "อาหารอีสาน");
    await expect(chosen(sw)).toHaveText("ปกติ"); // default
    await vote(sw, "เห็นด้วย");
    await expect(chosen(sw)).toHaveText("เห็นด้วย");
    await expect(page.getByTestId("cat-isan")).toContainText("×1.5");
    await vote(sw, "ปกติ");
    await expect(chosen(sw)).toHaveText("ปกติ");
    await expect(page.getByTestId("cat-isan")).not.toContainText("×");
  });

  test("TC-VOTE-04 โหวตยังอยู่หลังรีโหลด @P3", async ({ page }) => {
    await openHome(page);
    await vote(catSwitch(page, "อาหารญี่ปุ่น"), "เห็นด้วย");
    await expect(chosen(catSwitch(page, "อาหารญี่ปุ่น"))).toHaveText("เห็นด้วย");
    await page.reload();
    await expect(chosen(catSwitch(page, "อาหารญี่ปุ่น"))).toHaveText("เห็นด้วย");
    const top = await topRowNumber(page);
    expect(byNumber.get(top)!.categories).toContain("japanese");
  });

  test("TC-VOTE-05 ร้านหลายแนวได้ตัวคูณของแนวที่ดีที่สุด @P2", async ({ page }) => {
    // a place serving both noodle and isan: noodle −1 and isan +1 -> takes ×1.5, not ×0.5
    const both = SEED.find((r) => r.categories.includes("noodle") && r.categories.includes("isan"));
    test.skip(!both, "no restaurant has both categories in the data");
    await openHome(page);
    await vote(catSwitch(page, "ก๋วยเตี๋ยว / เมนูเส้น"), "ไม่เห็นด้วย");
    await vote(catSwitch(page, "อาหารอีสาน"), "เห็นด้วย");
    const weight = (r: (typeof SEED)[number]) =>
      Math.max(...r.categories.map((c) => (c === "noodle" ? 0.5 : c === "isan" ? 1.5 : 1)));
    const total = SEED.reduce((s, r) => s + weight(r), 0);
    await showAll(page);
    await expect(row(page, both!.number)).toBeVisible();
    expect(await rowPercent(page, both!.number)).toBe(pct(1.5 / total));
  });
});

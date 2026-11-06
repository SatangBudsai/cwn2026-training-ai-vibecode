import {
  TOTAL,
  byNumber,
  catSwitch,
  choose,
  chosen,
  createRoom,
  expect,
  joinRoom,
  newMember,
  openHome,
  pct,
  placeSwitch,
  rowPercent,
  rows,
  saveVotes,
  test,
  topRowNumber,
} from "../fixtures";

const shownOrder = (page: import("@playwright/test").Page) =>
  rows(page).evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-number"))));

test.describe("บันทึกโหวต", () => {
  test("TC-VOTE-09 โหวตแล้วกระดานไม่เรียงใหม่ จนกว่าจะกด บันทึกโหวต @P1", async ({ page }) => {
    await openHome(page);
    const before = await shownOrder(page);
    await choose(catSwitch(page, "ก๋วยเตี๋ยว / เมนูเส้น"), "เห็นด้วย");
    await choose(placeSwitch(page, before[2]), "ไม่เห็นด้วย");

    // drafts: switches show the choice, marked unsaved, but the odds and the order stay put
    await expect(chosen(catSwitch(page, "ก๋วยเตี๋ยว / เมนูเส้น"))).toHaveText("เห็นด้วย");
    await expect(catSwitch(page, "ก๋วยเตี๋ยว / เมนูเส้น")).toHaveAttribute("data-pending", "true");
    await expect(page.getByTestId("vote-savebar")).toContainText("มีโหวตที่ยังไม่บันทึก 2 รายการ");
    expect(await shownOrder(page)).toEqual(before);
    expect(await rowPercent(page, before[0])).toBe(pct(1 / TOTAL));

    await saveVotes(page);
    // now the odds are recomputed: a noodle place leads
    expect(byNumber.get(await topRowNumber(page))!.categories).toContain("noodle");
    await expect(catSwitch(page, "ก๋วยเตี๋ยว / เมนูเส้น")).not.toHaveAttribute("data-pending", "true");
  });

  test("TC-VOTE-10 กด ยกเลิก แล้วโหวตกลับเป็นค่าเดิม @P2", async ({ page }) => {
    await openHome(page);
    const sw = catSwitch(page, "อาหารอีสาน");
    await choose(sw, "เห็นด้วย");
    await expect(page.getByTestId("vote-savebar")).toBeVisible();
    await page.getByTestId("vote-savebar").getByRole("button", { name: "ยกเลิก" }).click();
    await expect(page.getByTestId("vote-savebar")).toHaveCount(0);
    await expect(chosen(sw)).toHaveText("ปกติ");
    // choosing what is already saved is not a change
    await choose(sw, "ปกติ");
    await expect(page.getByTestId("vote-savebar")).toHaveCount(0);
  });

  test("TC-ROOM-17 ในห้อง คนอื่นเห็นโหวตหลังกดบันทึกเท่านั้น @P2", async ({ page, browser }) => {
    const url = await createRoom(page, "ต้น");
    const b = await newMember(browser);
    await joinRoom(b, url, "มิว");
    await choose(catSwitch(page, "อาหารอีสาน"), "เห็นด้วย");
    // not saved yet: the other screen still shows nothing
    await b.waitForTimeout(1_500);
    await expect(b.getByTestId("cat-isan").getByTestId("vote-net")).toHaveText("รวม 0");
    await saveVotes(page);
    await expect(b.getByTestId("cat-isan").getByTestId("vote-net")).toHaveText("รวม +1", { timeout: 3_000 });
    await b.context().close();
  });
});

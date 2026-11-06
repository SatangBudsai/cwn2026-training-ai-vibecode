import { describe, expect, it } from "vitest";
import { matchesQuery } from "./search";

const labels = new Map([
  ["noodle", "ก๋วยเตี๋ยว / เมนูเส้น"],
  ["isan", "อาหารอีสาน"],
]);
const r = { number: 12, name: "วัดแขกก๋วยจั๊บ", nameEn: "Kuey Chap", nickname: "ร้านประจำ", categories: ["noodle"] };

describe("restaurant search", () => {
  it("matches name, English name, nickname and category, ignoring case and spaces", () => {
    expect(matchesQuery(r, "ก๋วยจั๊บ", labels)).toBe(true);
    expect(matchesQuery(r, "kueychap", labels)).toBe(true);
    expect(matchesQuery(r, "ร้าน ประจำ", labels)).toBe(true);
    expect(matchesQuery(r, "เมนูเส้น", labels)).toBe(true);
    expect(matchesQuery(r, "อีสาน", labels)).toBe(false);
  });

  it("matches the restaurant number, with or without #", () => {
    expect(matchesQuery(r, "12", labels)).toBe(true);
    expect(matchesQuery(r, "#12", labels)).toBe(true);
    expect(matchesQuery(r, "13", labels)).toBe(false);
  });

  it("an empty query matches everything", () => {
    expect(matchesQuery(r, "  ", labels)).toBe(true);
  });
});

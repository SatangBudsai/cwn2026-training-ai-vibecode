import { describe, expect, it } from "vitest";
import {
  categoryMultiplier,
  computeOdds,
  pick,
  recencyMultiplier,
  restaurantWeight,
  sumVotes,
  nearMultiplier,
  parsePrices,
  ratingFor,
  ratingMultiplier,
  type OddsRestaurant,
} from "./odds";

const ALL = { lazy: false, prices: [] };

const r = (id: number, categories: string[], extra: Partial<OddsRestaurant> = {}): OddsRestaurant => ({
  id,
  baseWeight: 1,
  distance: 200,
  walkDistance: 250,
  categories,
  ...extra,
});

describe("weights", () => {
  it("votes move the category multiplier and never go below the floor", () => {
    expect(categoryMultiplier(0)).toBe(1);
    expect(categoryMultiplier(2)).toBe(2);
    expect(categoryMultiplier(-10)).toBe(0.1);
  });

  it("a restaurant takes its best category", () => {
    expect(restaurantWeight(r(1, ["noodle", "isan"]), { noodle: -2, isan: 2 })).toBe(2);
  });

  it("base weight 0 removes a restaurant", () => {
    expect(restaurantWeight(r(1, ["noodle"], { baseWeight: 0 }), { noodle: 5 })).toBe(0);
  });

  it("sums member votes per category", () => {
    expect(sumVotes([
      { categoryId: "noodle", value: 1 },
      { categoryId: "noodle", value: 1 },
      { categoryId: "isan", value: -1 },
    ])).toEqual({ noodle: 2, isan: -1 });
  });
});

describe("recently eaten", () => {
  const now = Date.parse("2026-11-06T05:00:00Z");
  const daysAgo = (d: number) => new Date(now - d * 24 * 3600 * 1000).toISOString();

  it("eaten today drops to the floor, recovers linearly, gone after 7 days", () => {
    expect(recencyMultiplier(daysAgo(0), now)).toBeCloseTo(0.2);
    expect(recencyMultiplier(daysAgo(3.5), now)).toBeCloseTo(0.6);
    expect(recencyMultiplier(daysAgo(7), now)).toBe(1);
    expect(recencyMultiplier(null, now)).toBe(1);
  });

  it("a visit stamped just after the page loaded still counts as today", () => {
    expect(recencyMultiplier(new Date(now + 60_000).toISOString(), now)).toBeCloseTo(0.2);
  });

  it("stacks with category votes", () => {
    expect(restaurantWeight(r(1, ["noodle"], { lastEatenAt: daysAgo(0) }), { noodle: 2 }, now)).toBeCloseTo(0.4);
  });
});

describe("odds", () => {
  const list = [
    r(1, ["noodle"]),
    r(2, ["isan"]),
    r(3, ["japanese"], { walkDistance: 800 }),
    r(4, ["thai"], { walkDistance: null, distance: 450 }), // 450 * 1.3 = 585 m estimated walk
  ];

  it("probabilities add up to 1", () => {
    const odds = computeOdds(list, { noodle: 2 }, ALL);
    expect(odds.reduce((s, o) => s + o.p, 0)).toBeCloseTo(1);
    expect(odds[0].id).toBe(1);
  });

  it("lazy mode keeps only places within a 500 m walk", () => {
    expect(computeOdds(list, {}, { lazy: true, prices: [] }).map((o) => o.id).sort()).toEqual([1, 2]);
  });

  it("pick follows the weights over many draws", () => {
    const odds = computeOdds(list.slice(0, 2), { noodle: 2 }, ALL); // weights 2 : 1
    const counts: Record<number, number> = { 1: 0, 2: 0 };
    const N = 20000;
    for (let i = 0; i < N; i++) counts[pick(odds, Math.random())!.id]++;
    expect(counts[1] / N).toBeCloseTo(2 / 3, 1);
  });

  it("pick returns null when nothing can be drawn", () => {
    expect(pick(computeOdds([r(1, ["noodle"], { baseWeight: 0 })], {}, ALL), 0.5)).toBeNull();
  });
});

describe("restaurant votes", () => {
  it("votes for a restaurant multiply its weight, on top of category votes", () => {
    const x = r(7, ["noodle"]);
    expect(restaurantWeight(x, {}, Date.now(), { 7: 2 })).toBe(2);
    expect(restaurantWeight(x, { noodle: 1 }, Date.now(), { 7: 2 })).toBe(3);
    expect(restaurantWeight(x, {}, Date.now(), { 7: -5 })).toBeCloseTo(0.1);
    expect(restaurantWeight(x, {}, Date.now(), { 8: 3 })).toBe(1); // votes for another place
  });

  it("odds follow restaurant votes", () => {
    const odds = computeOdds([r(1, ["thai"]), r(2, ["thai"])], {}, ALL, Date.now(), { 2: 2 });
    expect(odds[0]).toMatchObject({ id: 2, p: 2 / 3 });
  });
});

describe("lazy mode prefers the closest places", () => {
  it("×2 at the door, ×1 at 500 m, no effect outside lazy mode", () => {
    expect(nearMultiplier({ distance: 0, walkDistance: 0 }, true)).toBe(2);
    expect(nearMultiplier({ distance: 0, walkDistance: 250 }, true)).toBe(1.5);
    expect(nearMultiplier({ distance: 0, walkDistance: 500 }, true)).toBe(1);
    expect(nearMultiplier({ distance: 0, walkDistance: 100 }, false)).toBe(1);
  });

  it("closer places get higher odds in lazy mode", () => {
    const near = r(1, ["thai"], { walkDistance: 100 });
    const far = r(2, ["thai"], { walkDistance: 400 });
    const odds = computeOdds([far, near], {}, { lazy: true, prices: [] });
    expect(odds[0].id).toBe(1);
    expect(odds[0].p).toBeCloseTo(1.8 / (1.8 + 1.2));
    expect(computeOdds([far, near], {}, ALL)[0].p).toBe(0.5);
  });
});

describe("cat ratings", () => {
  it("average 1 -> ×0.6, 4 -> ×1.4, none -> ×1", () => {
    expect(ratingMultiplier(1)).toBeCloseTo(0.6);
    expect(ratingMultiplier(4)).toBeCloseTo(1.4);
    expect(ratingMultiplier(2.5)).toBeCloseTo(1);
    expect(ratingMultiplier(null)).toBe(1);
  });

  it("picks the cat for an average", () => {
    expect(ratingFor(3.6).label).toBe("อร่อยมาก");
    expect(ratingFor(1.2).label).toBe("ไม่ไหว");
  });

  it("well rated places get higher odds", () => {
    const odds = computeOdds([r(1, ["thai"], { ratingAvg: 4 }), r(2, ["thai"], { ratingAvg: 1 })], {}, ALL);
    expect(odds[0]).toMatchObject({ id: 1, p: 1.4 / 2 });
  });
});

describe("filters", () => {
  const list = [
    r(1, ["noodle"], { priceLevel: 1 }),
    r(2, ["noodle"], { priceLevel: 3 }),
    r(3, ["noodle"], { priceLevel: null }),
    r(4, ["noodle"], { priceLevel: 1, disabled: true }),
  ];
  const ids = (prices: number[]) => computeOdds(list, {}, { lazy: false, prices }).map((o) => o.id).sort();

  it("disabled restaurants never appear", () => {
    expect(ids([])).toEqual([1, 2, 3]);
  });

  it("price filter keeps the chosen levels, 0 means price not set", () => {
    expect(ids([1])).toEqual([1]);
    expect(ids([1, 0])).toEqual([1, 3]);
  });

  it("parses price filters from csv or arrays and drops junk", () => {
    expect(parsePrices("2,1,x,9")).toEqual([1, 2]);
    expect(parsePrices([0, 4, 4])).toEqual([0, 4]);
    expect(parsePrices("")).toEqual([]);
  });
});

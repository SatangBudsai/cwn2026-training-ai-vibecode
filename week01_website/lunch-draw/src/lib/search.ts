// Restaurant search: name, nickname, English name, food category labels or the restaurant number.

type Searchable = { number: number; name: string; nameEn: string | null; nickname: string | null; categories: string[] };

/** lower case, no spaces, no zero-width characters: "Kuey  Chap" and "kueychap" match */
export function normalize(s: string) {
  return s.toLowerCase().replace(/[\s​-‍﻿]+/g, "");
}

export function matchesQuery(r: Searchable, query: string, labels: Map<string, string>) {
  const q = normalize(query.replace(/^#/, ""));
  if (!q) return true;
  if (/^\d+$/.test(q) && r.number === Number(q)) return true;
  const fields = [r.name, r.nameEn ?? "", r.nickname ?? "", ...r.categories.map((c) => labels.get(c) ?? "")];
  return fields.some((f) => normalize(f).includes(q));
}

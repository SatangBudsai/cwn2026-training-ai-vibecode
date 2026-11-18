// Places offered by the origin/destination autocomplete.
// A "city" or "country" place covers every airport inside it (C8).

export type PlaceKind = "city" | "airport" | "country";
export interface Place {
  id: string;
  kind: PlaceKind;
  name: string;
  detail: string;
  airports: string[];
  keywords: string;
}

export const PLACES: Place[] = [
  { id: "BKK-CITY", kind: "city", name: "กรุงเทพมหานคร", detail: "เมืองในประเทศไทย · ทุกสนามบิน", airports: ["BKK", "DMK"], keywords: "กรุงเทพ bangkok bkk dmk ไทย thailand" },
  { id: "BKK", kind: "airport", name: "ท่าอากาศยานสุวรรณภูมิ", detail: "BKK · กรุงเทพมหานคร", airports: ["BKK"], keywords: "สุวรรณภูมิ suvarnabhumi bkk กรุงเทพ bangkok" },
  { id: "DMK", kind: "airport", name: "ท่าอากาศยานดอนเมือง", detail: "DMK · กรุงเทพมหานคร", airports: ["DMK"], keywords: "ดอนเมือง don mueang dmk กรุงเทพ bangkok" },
  { id: "JP", kind: "country", name: "ญี่ปุ่น", detail: "ประเทศ · ทุกสนามบินในญี่ปุ่น", airports: ["NRT", "HND", "KIX", "ITM", "UKB", "NGO", "FUK", "CTS"], keywords: "ญี่ปุ่น japan nippon" },
  { id: "TYO", kind: "city", name: "โตเกียว", detail: "เมืองในญี่ปุ่น · NRT, HND", airports: ["NRT", "HND"], keywords: "โตเกียว tokyo tyo ญี่ปุ่น japan" },
  { id: "NRT", kind: "airport", name: "ท่าอากาศยานนานาชาตินะริตะ", detail: "NRT · โตเกียว", airports: ["NRT"], keywords: "นะริตะ narita nrt โตเกียว tokyo" },
  { id: "HND", kind: "airport", name: "ท่าอากาศยานนานาชาติโตเกียว (ฮะเนะดะ)", detail: "HND · โตเกียว", airports: ["HND"], keywords: "ฮาเนดะ ฮะเนะดะ haneda hnd โตเกียว tokyo" },
  { id: "OSA", kind: "city", name: "โอซากะ", detail: "เมืองในญี่ปุ่น · KIX, ITM", airports: ["KIX", "ITM"], keywords: "โอซาก้า โอซากะ osaka kix itm ญี่ปุ่น" },
  { id: "NGO", kind: "city", name: "นาโงยะ", detail: "เมืองในญี่ปุ่น · NGO", airports: ["NGO"], keywords: "นาโงย่า นาโงยะ nagoya ngo ญี่ปุ่น" },
  { id: "FUK", kind: "city", name: "ฟุกุโอะกะ", detail: "เมืองในญี่ปุ่น · FUK", airports: ["FUK"], keywords: "ฟุกุโอกะ fukuoka fuk ญี่ปุ่น" },
  { id: "CTS", kind: "city", name: "ซัปโปะโระ", detail: "เมืองในญี่ปุ่น · CTS", airports: ["CTS"], keywords: "ซัปโปโร sapporo cts ฮอกไกโด ญี่ปุ่น" },
];

export const PLACE_BY_ID = new Map(PLACES.map((p) => [p.id, p]));

export function parsePlaceIds(raw: string | undefined | null): Place[] {
  if (!raw) return [];
  return raw.split(",").map((s) => PLACE_BY_ID.get(s.trim())).filter((p): p is Place => !!p);
}

export function airportsOf(places: Place[]): string[] {
  return Array.from(new Set(places.flatMap((p) => p.airports)));
}

export function placesLabel(places: Place[]): string {
  if (places.length === 0) return "";
  if (places.length === 1) return places[0].name;
  return places.map((p) => (p.kind === "airport" ? p.airports[0] : p.name)).join(", ");
}

export function searchPlaces(q: string): Place[] {
  const s = q.trim().toLowerCase();
  if (!s) return PLACES;
  return PLACES.filter((p) => (p.name + " " + p.detail + " " + p.keywords).toLowerCase().includes(s));
}

// Alliance membership is general public knowledge (not in the captured data) — [R].
export const ALLIANCE_OF: Record<string, string> = {
  TG: "STAR_ALLIANCE", NH: "STAR_ALLIANCE", SQ: "STAR_ALLIANCE", OZ: "STAR_ALLIANCE", BR: "STAR_ALLIANCE",
  CA: "STAR_ALLIANCE", ZH: "STAR_ALLIANCE", AI: "STAR_ALLIANCE", LH: "STAR_ALLIANCE", TK: "STAR_ALLIANCE",
  JL: "ONEWORLD", CX: "ONEWORLD", QR: "ONEWORLD", MH: "ONEWORLD", AY: "ONEWORLD", BA: "ONEWORLD", UL: "ONEWORLD",
  KE: "SKYTEAM", CI: "SKYTEAM", MU: "SKYTEAM", VN: "SKYTEAM", GA: "SKYTEAM", MF: "SKYTEAM", AF: "SKYTEAM", KL: "SKYTEAM",
};

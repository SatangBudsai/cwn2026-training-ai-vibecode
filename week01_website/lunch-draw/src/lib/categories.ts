// Food categories ("ประเภทอาหาร"). Each restaurant has one or more; members vote on
// which ones they feel like today, and that vote drives the restaurant odds.
export const CATEGORIES = [
  { id: "noodle", label: "ก๋วยเตี๋ยว / เมนูเส้น" },
  { id: "rice-curry", label: "ข้าวแกง" },
  { id: "made-to-order", label: "อาหารตามสั่ง" },
  { id: "one-dish", label: "ข้าวจานเดียว" },
  { id: "isan", label: "อาหารอีสาน" },
  { id: "southern", label: "อาหารปักษ์ใต้" },
  { id: "thai", label: "อาหารไทย" },
  { id: "chinese", label: "อาหารจีน" },
  { id: "japanese", label: "อาหารญี่ปุ่น" },
  { id: "korean", label: "อาหารเกาหลี" },
  { id: "indian", label: "อาหารอินเดีย" },
  { id: "halal", label: "อาหารฮาลาล" },
  { id: "vegetarian", label: "มังสวิรัติ / อาหารเจ" },
  { id: "asian", label: "อาหารเอเชียอื่นๆ" },
  { id: "western", label: "อาหารตะวันตก" },
  { id: "fast-food", label: "ฟาสต์ฟู้ด" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

const CUISINE_MAP: Record<string, CategoryId> = {
  noodle: "noodle",
  ramen: "japanese",
  udon: "japanese",
  thai: "thai",
  curry: "rice-curry",
  chinese: "chinese",
  dim_sum: "chinese",
  japanese: "japanese",
  sushi: "japanese",
  korean: "korean",
  indian: "indian",
  nepalese: "indian",
  pakistani: "indian",
  halal: "halal",
  arab: "halal",
  lebanese: "halal",
  turkish: "halal",
  vegetarian: "vegetarian",
  vegan: "vegetarian",
  vietnamese: "asian",
  malaysian: "asian",
  burmese: "asian",
  asian: "asian",
  italian: "western",
  pizza: "western",
  french: "western",
  american: "western",
  steak_house: "western",
  mexican: "western",
  spanish: "western",
  german: "western",
  international: "western",
  burger: "fast-food",
  chicken: "fast-food",
  sandwich: "fast-food",
};

// Order matters only for readability; every match is added.
const NAME_RULES: [RegExp, CategoryId][] = [
  [/ก๋วยเตี๋ยว|เตี๋ยว|เย็นตาโฟ|บะหมี่|ก๋วยจั๊บ|จั๊บ|เส้น|noodle|kuey|ราดหน้า|ผัดไทย|ขนมจีน/i, "noodle"],
  [/ข้าวแกง|แกง|curry/i, "rice-curry"],
  [/ตามสั่ง|ครัว|kitchen/i, "made-to-order"],
  [/ข้าวมันไก่|ข้าวหมูกรอบ|ข้าวหมูแดง|ข้าวขาหมู|ข้าวมัน|หมูกรอบ|เป็ด|duck|chicken rice/i, "one-dish"],
  [/ส้มตำ|ตำ|อีสาน|ลาบ|ไก่ย่าง|somtam|isan|esan/i, "isan"],
  [/ปักษ์ใต้|แกงใต้|ใต้|southern/i, "southern"],
  [/ราเม็ง|ramen|sushi|ซูชิ|ญี่ปุ่น|japan|izakaya|udon|yakiniku|donburi/i, "japanese"],
  [/เกาหลี|korea|bbq/i, "korean"],
  [/indian|อินเดีย|tamil|chennai|annapurna|masala|tandoor|delhi|punjab|biryani/i, "indian"],
  [/ฮาลาล|halal|อิสลาม|มุสลิม/i, "halal"],
  [/มังสวิรัติ|เจ\b|vegetarian|vegan|veggie/i, "vegetarian"],
  [/pizza|พิซซ่า|trattoria|pasta|steak|bistro|burger|เบอร์เกอร์/i, "western"],
  [/kfc|mcdonald|burger king|subway|7-eleven/i, "fast-food"],
];

export function classify(name: string, cuisine: string, amenity: string): CategoryId[] {
  const found = new Set<CategoryId>();
  for (const raw of cuisine.split(/[;,]/)) {
    const c = CUISINE_MAP[raw.trim().toLowerCase()];
    if (c) found.add(c);
  }
  for (const [re, c] of NAME_RULES) if (re.test(name)) found.add(c);
  if (amenity === "fast_food" && found.size === 0) found.add("fast-food");
  if (found.size === 0) found.add("thai");
  return [...found];
}

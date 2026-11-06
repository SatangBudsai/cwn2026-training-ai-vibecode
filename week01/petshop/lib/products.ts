export type Pet = "cat" | "dog";
export type FoodType = "dry" | "wet" | "treat";
export type ProductType = FoodType | "toy" | "accessory";
export const FOOD_TYPES: FoodType[] = ["dry", "wet", "treat"];
export function isFood(t: ProductType): t is FoodType {
  return t === "dry" || t === "wet" || t === "treat";
}
export type LifeStage = "baby" | "adult" | "senior";
export type Protein = "chicken" | "salmon" | "tuna" | "beef" | "lamb" | "duck";

export interface Size {
  label: string;
  price: number;
}

export interface Review {
  name: string;
  stars: number;
  text: string;
  date: string;
}

export interface Product {
  slug: string;
  name: string;
  nameEn: string;
  pet: Pet;
  type: ProductType;
  lifeStage: LifeStage;
  protein: Protein | null;
  grainFree: boolean;
  sizes: Size[];
  /** Seed stock (live stock lives in the server store). Shared by all sizes. */
  stock: number;
  rating: number;
  /** Total number of reviews shown next to the rating. */
  reviewCount: number;
  /** A few written reviews shown on the detail page. */
  reviews: Review[];
  popularity: number;
  boughtWith: string[];
  description: string;
}

export const PET_LABEL: Record<Pet, string> = { cat: "แมว", dog: "สุนัข" };
export const PET_EMOJI: Record<Pet, string> = { cat: "🐱", dog: "🐶" };
export const TYPE_LABEL: Record<ProductType, string> = {
  dry: "อาหารเม็ด",
  wet: "อาหารเปียก",
  treat: "ขนม",
  toy: "ของเล่น",
  accessory: "ของใช้",
};
export const LIFE_LABEL: Record<LifeStage, string> = {
  baby: "วัยเด็ก",
  adult: "วัยโต",
  senior: "สูงวัย",
};
export const LIFE_PET_LABEL: Record<Pet, Record<LifeStage, string>> = {
  cat: { baby: "ลูกแมว", adult: "แมวโต", senior: "แมวสูงวัย" },
  dog: { baby: "ลูกสุนัข", adult: "สุนัขโต", senior: "สุนัขสูงวัย" },
};
export const PROTEIN_LABEL: Record<Protein, string> = {
  chicken: "ไก่",
  salmon: "แซลมอน",
  tuna: "ทูน่า",
  beef: "เนื้อ",
  lamb: "แกะ",
  duck: "เป็ด",
};

type Seed = Omit<Product, "reviews" | "reviewCount">;

const seeds: Seed[] = [
  {
    slug: "kitten-salmon-dry",
    name: "ลูกแมว สูตรแซลมอน",
    nameEn: "Kitten Salmon",
    pet: "cat",
    type: "dry",
    lifeStage: "baby",
    protein: "salmon",
    grainFree: true,
    sizes: [
      { label: "400 g", price: 189 },
      { label: "1.5 kg", price: 590 },
    ],
    stock: 25,
    rating: 4.8,
    popularity: 95,
    boughtWith: ["kitten-chicken-mousse", "lickable-salmon-treat"],
    description:
      "อาหารเม็ดสำหรับลูกแมวอายุ 2–12 เดือน เม็ดเล็กเคี้ยวง่าย อุดมด้วย DHA จากแซลมอนแท้ ช่วยพัฒนาสมองและสายตา",
  },
  {
    slug: "adult-chicken-dry",
    name: "แมวโต สูตรไก่",
    nameEn: "Adult Chicken",
    pet: "cat",
    type: "dry",
    lifeStage: "adult",
    protein: "chicken",
    grainFree: false,
    sizes: [
      { label: "1.2 kg", price: 359 },
      { label: "3 kg", price: 799 },
    ],
    stock: 40,
    rating: 4.6,
    popularity: 90,
    boughtWith: ["tuna-pouch"],
    description:
      "สูตรไก่อบหอมสำหรับแมวโตทุกสายพันธุ์ โปรตีนสูง ผสมทอรีนและโอเมก้า 3 ช่วยให้ขนนุ่มเงางาม",
  },
  {
    slug: "senior-tuna-dry",
    name: "แมวสูงวัย สูตรทูน่า",
    nameEn: "Senior Tuna",
    pet: "cat",
    type: "dry",
    lifeStage: "senior",
    protein: "tuna",
    grainFree: false,
    sizes: [{ label: "1.2 kg", price: 429 }],
    stock: 12,
    rating: 4.5,
    popularity: 60,
    boughtWith: ["urinary-care-dry"],
    description:
      "สำหรับแมวอายุ 7 ปีขึ้นไป ไขมันต่ำ ย่อยง่าย เสริมกลูโคซามีนบำรุงข้อต่อ รสทูน่าที่แมวสูงวัยชอบ",
  },
  {
    slug: "tuna-pouch",
    name: "เพาช์ทูน่าในเยลลี่",
    nameEn: "Tuna in Jelly",
    pet: "cat",
    type: "wet",
    lifeStage: "adult",
    protein: "tuna",
    grainFree: true,
    sizes: [
      { label: "ซอง 85 g", price: 35 },
      { label: "แพ็ค 12 ซอง", price: 390 },
    ],
    stock: 60,
    rating: 4.7,
    popularity: 88,
    boughtWith: ["adult-chicken-dry"],
    description:
      "เนื้อทูน่าชิ้นโตในเยลลี่ใส ช่วยเพิ่มน้ำให้ร่างกาย เหมาะเป็นมื้อหลักหรือท็อปปิ้งบนอาหารเม็ด",
  },
  {
    slug: "kitten-chicken-mousse",
    name: "มูสไก่ลูกแมว",
    nameEn: "Kitten Chicken Mousse",
    pet: "cat",
    type: "wet",
    lifeStage: "baby",
    protein: "chicken",
    grainFree: false,
    sizes: [
      { label: "ซอง 85 g", price: 39 },
      { label: "แพ็ค 12 ซอง", price: 420 },
    ],
    stock: 30,
    rating: 4.4,
    popularity: 70,
    boughtWith: ["kitten-salmon-dry"],
    description: "มูสเนื้อเนียนนุ่มสำหรับลูกแมวหย่านม กินง่าย ย่อยง่าย เสริมแคลเซียมเพื่อกระดูกแข็งแรง",
  },
  {
    slug: "duck-grainfree-dry",
    name: "แมวโต เป็ดเกรนฟรี",
    nameEn: "Grain-Free Duck",
    pet: "cat",
    type: "dry",
    lifeStage: "adult",
    protein: "duck",
    grainFree: true,
    sizes: [{ label: "1.5 kg", price: 690 }],
    stock: 15,
    rating: 4.9,
    popularity: 84,
    boughtWith: ["lickable-salmon-treat"],
    description:
      "สูตรเกรนฟรีจากเนื้อเป็ด เหมาะกับแมวที่แพ้ง่าย ไม่มีข้าวสาลีและข้าวโพด ลดอาการคันและขนร่วง",
  },
  {
    slug: "lickable-salmon-treat",
    name: "ขนมแมวเลีย แซลมอน",
    nameEn: "Lickable Salmon",
    pet: "cat",
    type: "treat",
    lifeStage: "adult",
    protein: "salmon",
    grainFree: true,
    sizes: [
      { label: "4 ซอง", price: 69 },
      { label: "20 ซอง", price: 299 },
    ],
    stock: 80,
    rating: 4.8,
    popularity: 99,
    boughtWith: ["duck-grainfree-dry"],
    description: "ขนมแมวเลียเนื้อครีมรสแซลมอน ป้อนจากมือได้ สร้างความผูกพัน และช่วยให้น้องกินน้ำมากขึ้น",
  },
  {
    slug: "freeze-dried-chicken-cat",
    name: "ไก่ฟรีซดราย สำหรับแมว",
    nameEn: "Freeze-Dried Chicken",
    pet: "cat",
    type: "treat",
    lifeStage: "adult",
    protein: "chicken",
    grainFree: true,
    sizes: [{ label: "50 g", price: 159 }],
    stock: 0,
    rating: 4.7,
    popularity: 75,
    boughtWith: ["adult-chicken-dry"],
    description: "อกไก่แท้ 100% ผ่านการฟรีซดรายเก็บคุณค่าสารอาหาร กรอบอร่อย ไม่ใส่สารกันบูด",
  },
  {
    slug: "hairball-control-dry",
    name: "สูตรลดก้อนขน",
    nameEn: "Hairball Control",
    pet: "cat",
    type: "dry",
    lifeStage: "adult",
    protein: "salmon",
    grainFree: false,
    sizes: [{ label: "1.5 kg", price: 520 }],
    stock: 3,
    rating: 4.3,
    popularity: 55,
    boughtWith: ["lickable-salmon-treat"],
    description: "ไฟเบอร์ธรรมชาติช่วยขับก้อนขนออกทางระบบขับถ่าย เหมาะกับแมวขนยาวและแมวเลียขนบ่อย",
  },
  {
    slug: "urinary-care-dry",
    name: "สูตรดูแลทางเดินปัสสาวะ",
    nameEn: "Urinary Care",
    pet: "cat",
    type: "dry",
    lifeStage: "senior",
    protein: "chicken",
    grainFree: false,
    sizes: [{ label: "1.5 kg", price: 650 }],
    stock: 8,
    rating: 4.6,
    popularity: 58,
    boughtWith: ["senior-tuna-dry"],
    description: "ควบคุมแร่ธาตุและค่า pH ในปัสสาวะ ลดความเสี่ยงการเกิดนิ่ว เหมาะกับแมวสูงวัยและแมวทำหมัน",
  },
  {
    slug: "puppy-chicken-dry",
    name: "ลูกสุนัข สูตรไก่และข้าว",
    nameEn: "Puppy Chicken & Rice",
    pet: "dog",
    type: "dry",
    lifeStage: "baby",
    protein: "chicken",
    grainFree: false,
    sizes: [
      { label: "1 kg", price: 259 },
      { label: "3 kg", price: 690 },
    ],
    stock: 35,
    rating: 4.7,
    popularity: 92,
    boughtWith: ["puppy-lamb-wet"],
    description: "อาหารลูกสุนัขสูตรไก่และข้าว ย่อยง่าย เสริมแคลเซียมและ DHA เพื่อการเติบโตอย่างสมวัย",
  },
  {
    slug: "adult-lamb-dry",
    name: "สุนัขโต สูตรแกะ",
    nameEn: "Adult Lamb",
    pet: "dog",
    type: "dry",
    lifeStage: "adult",
    protein: "lamb",
    grainFree: false,
    sizes: [
      { label: "3 kg", price: 790 },
      { label: "8 kg", price: 1890 },
    ],
    stock: 20,
    rating: 4.6,
    popularity: 86,
    boughtWith: ["dental-chew-treat"],
    description: "เนื้อแกะคุณภาพสูง เหมาะกับสุนัขผิวแพ้ง่าย เสริมโอเมก้า 6 และ 3 เพื่อผิวหนังและขนที่แข็งแรง",
  },
  {
    slug: "senior-salmon-dry",
    name: "สุนัขสูงวัย สูตรแซลมอน",
    nameEn: "Senior Salmon",
    pet: "dog",
    type: "dry",
    lifeStage: "senior",
    protein: "salmon",
    grainFree: true,
    sizes: [{ label: "3 kg", price: 990 }],
    stock: 10,
    rating: 4.8,
    popularity: 65,
    boughtWith: ["salmon-skin-treat"],
    description: "สำหรับสุนัขอายุ 7 ปีขึ้นไป แคลอรีพอดี เสริมกลูโคซามีนและคอนดรอยติน ดูแลข้อต่อให้เดินได้คล่อง",
  },
  {
    slug: "beef-stew-can",
    name: "สตูว์เนื้อกระป๋อง",
    nameEn: "Beef Stew",
    pet: "dog",
    type: "wet",
    lifeStage: "adult",
    protein: "beef",
    grainFree: false,
    sizes: [
      { label: "400 g", price: 79 },
      { label: "แพ็ค 6 กระป๋อง", price: 450 },
    ],
    stock: 50,
    rating: 4.5,
    popularity: 80,
    boughtWith: ["small-breed-chicken-dry"],
    description: "สตูว์เนื้อวัวชิ้นโตกับผักรวมในน้ำซอสเข้มข้น หอมน่ากิน ใช้เป็นมื้อหลักหรือผสมอาหารเม็ดก็ได้",
  },
  {
    slug: "puppy-lamb-wet",
    name: "ลูกสุนัข แกะบด",
    nameEn: "Puppy Lamb Pâté",
    pet: "dog",
    type: "wet",
    lifeStage: "baby",
    protein: "lamb",
    grainFree: true,
    sizes: [{ label: "100 g", price: 45 }],
    stock: 40,
    rating: 4.4,
    popularity: 62,
    boughtWith: ["puppy-chicken-dry"],
    description: "เนื้อแกะบดละเอียดสำหรับลูกสุนัข นุ่มลิ้น กินง่าย ช่วยให้ลูกสุนัขเจริญอาหาร",
  },
  {
    slug: "dental-chew-treat",
    name: "ขนมขัดฟัน",
    nameEn: "Dental Chew",
    pet: "dog",
    type: "treat",
    lifeStage: "adult",
    protein: "chicken",
    grainFree: false,
    sizes: [
      { label: "7 ชิ้น", price: 149 },
      { label: "28 ชิ้น", price: 499 },
    ],
    stock: 70,
    rating: 4.7,
    popularity: 97,
    boughtWith: ["adult-lamb-dry"],
    description: "ขนมขัดฟันรูปดาว ช่วยลดคราบหินปูนและกลิ่นปาก เคี้ยวเพลินวันละชิ้นเพื่อฟันขาวสะอาด",
  },
  {
    slug: "duck-jerky-treat",
    name: "เป็ดอบแห้ง",
    nameEn: "Duck Jerky",
    pet: "dog",
    type: "treat",
    lifeStage: "adult",
    protein: "duck",
    grainFree: true,
    sizes: [{ label: "100 g", price: 189 }],
    stock: 25,
    rating: 4.9,
    popularity: 89,
    boughtWith: ["adult-lamb-dry"],
    description: "อกเป็ดแท้อบแห้งอย่างช้า ๆ ไม่ใส่สีและสารกันบูด เหมาะเป็นรางวัลระหว่างฝึก",
  },
  {
    slug: "small-breed-chicken-dry",
    name: "สุนัขพันธุ์เล็ก สูตรไก่",
    nameEn: "Small Breed Chicken",
    pet: "dog",
    type: "dry",
    lifeStage: "adult",
    protein: "chicken",
    grainFree: false,
    sizes: [{ label: "1.5 kg", price: 420 }],
    stock: 30,
    rating: 4.5,
    popularity: 78,
    boughtWith: ["beef-stew-can"],
    description: "เม็ดเล็กพิเศษสำหรับสุนัขพันธุ์เล็ก พลังงานสูงพอดีกับความซน ช่วยให้ขนสวยและฟันแข็งแรง",
  },
  {
    slug: "large-breed-beef-dry",
    name: "สุนัขพันธุ์ใหญ่ สูตรเนื้อ",
    nameEn: "Large Breed Beef",
    pet: "dog",
    type: "dry",
    lifeStage: "adult",
    protein: "beef",
    grainFree: false,
    sizes: [{ label: "10 kg", price: 1590 }],
    stock: 6,
    rating: 4.4,
    popularity: 57,
    boughtWith: ["dental-chew-treat"],
    description: "เม็ดใหญ่สำหรับสุนัขพันธุ์ใหญ่ โปรตีนจากเนื้อวัว เสริมกลูโคซามีนดูแลข้อต่อที่รับน้ำหนักมาก",
  },
  {
    slug: "salmon-skin-treat",
    name: "หนังปลาแซลมอนกรอบ",
    nameEn: "Crispy Salmon Skin",
    pet: "dog",
    type: "treat",
    lifeStage: "senior",
    protein: "salmon",
    grainFree: true,
    sizes: [{ label: "80 g", price: 129 }],
    stock: 14,
    rating: 4.6,
    popularity: 68,
    boughtWith: ["senior-salmon-dry"],
    description: "หนังปลาแซลมอนอบกรอบ อุดมด้วยโอเมก้า 3 ช่วยบำรุงขนและผิว เคี้ยวง่ายเหมาะกับสุนัขสูงวัย",
  },
  {
    slug: "cat-feather-wand",
    name: "ไม้ตกแมว ขนนก",
    nameEn: "Feather Wand",
    pet: "cat",
    type: "toy",
    lifeStage: "adult",
    protein: null,
    grainFree: false,
    sizes: [{ label: "1 ชิ้น", price: 129 }],
    stock: 45,
    rating: 4.8,
    popularity: 91,
    boughtWith: ["lickable-salmon-treat"],
    description: "ไม้ตกแมวขนนกธรรมชาติพร้อมกระดิ่ง ปลุกสัญชาตญาณนักล่า ช่วยให้น้องได้ออกกำลังและคลายเครียด",
  },
  {
    slug: "cat-tunnel",
    name: "อุโมงค์แมว 3 ทาง",
    nameEn: "Crinkle Tunnel",
    pet: "cat",
    type: "toy",
    lifeStage: "adult",
    protein: null,
    grainFree: false,
    sizes: [{ label: "1 ชิ้น", price: 390 }],
    stock: 12,
    rating: 4.6,
    popularity: 64,
    boughtWith: ["cat-feather-wand"],
    description: "อุโมงค์ผ้าพับได้ 3 ทาง มีเสียงกรอบแกรบเร้าความสนใจ เป็นทั้งที่เล่นซ่อนหาและมุมงีบส่วนตัวของน้อง",
  },
  {
    slug: "cat-scratcher",
    name: "ที่ลับเล็บแมว",
    nameEn: "Cardboard Scratcher",
    pet: "cat",
    type: "accessory",
    lifeStage: "adult",
    protein: null,
    grainFree: false,
    sizes: [{ label: "1 ชิ้น", price: 259 }],
    stock: 20,
    rating: 4.7,
    popularity: 73,
    boughtWith: ["cat-feather-wand"],
    description: "ที่ลับเล็บกระดาษลูกฟูกหนาพิเศษ ทรงโค้งนอนได้ ช่วยถนอมโซฟาและเฟอร์นิเจอร์ในบ้าน",
  },
  {
    slug: "cat-fountain",
    name: "น้ำพุแมว",
    nameEn: "Water Fountain",
    pet: "cat",
    type: "accessory",
    lifeStage: "adult",
    protein: null,
    grainFree: false,
    sizes: [{ label: "2 ลิตร", price: 890 }],
    stock: 7,
    rating: 4.5,
    popularity: 59,
    boughtWith: ["urinary-care-dry"],
    description: "น้ำพุแมวความจุ 2 ลิตร พร้อมไส้กรองคาร์บอน น้ำไหลเวียนตลอดเวลา กระตุ้นให้น้องดื่มน้ำมากขึ้น",
  },
  {
    slug: "dog-rope-toy",
    name: "เชือกกัดสำหรับหมา",
    nameEn: "Rope Tug Toy",
    pet: "dog",
    type: "toy",
    lifeStage: "adult",
    protein: null,
    grainFree: false,
    sizes: [{ label: "1 ชิ้น", price: 149 }],
    stock: 50,
    rating: 4.7,
    popularity: 87,
    boughtWith: ["dental-chew-treat"],
    description: "เชือกฝ้ายถักแน่นสำหรับเล่นชักเย่อ ช่วยขัดฟันระหว่างเล่น และเสริมสายสัมพันธ์กับเจ้าของ",
  },
  {
    slug: "dog-squeaky-ball",
    name: "ลูกบอลมีเสียง",
    nameEn: "Squeaky Ball",
    pet: "dog",
    type: "toy",
    lifeStage: "adult",
    protein: null,
    grainFree: false,
    sizes: [{ label: "แพ็ค 3 ลูก", price: 199 }],
    stock: 35,
    rating: 4.8,
    popularity: 93,
    boughtWith: ["duck-jerky-treat"],
    description: "ลูกบอลยางธรรมชาติบีบมีเสียง เด้งดี ทนการกัด เหมาะสำหรับเล่นโยนรับในสวน",
  },
  {
    slug: "dog-slow-bowl",
    name: "ชามกินช้า",
    nameEn: "Slow Feeder Bowl",
    pet: "dog",
    type: "accessory",
    lifeStage: "adult",
    protein: null,
    grainFree: false,
    sizes: [{ label: "1 ใบ", price: 290 }],
    stock: 18,
    rating: 4.6,
    popularity: 66,
    boughtWith: ["adult-lamb-dry"],
    description: "ชามลายเขาวงกต ช่วยให้น้องหมากินช้าลง ลดอาการท้องอืดและสำลัก ฐานยางกันลื่น",
  },
  {
    slug: "dog-cozy-bed",
    name: "เบาะนอนนุ่มฟู",
    nameEn: "Cozy Bed",
    pet: "dog",
    type: "accessory",
    lifeStage: "adult",
    protein: null,
    grainFree: false,
    sizes: [
      { label: "M", price: 690 },
      { label: "L", price: 990 },
    ],
    stock: 9,
    rating: 4.9,
    popularity: 77,
    boughtWith: ["dental-chew-treat"],
    description: "เบาะนอนทรงโดนัทขนนุ่มฟู ขอบสูงรองคอ ช่วยให้น้องรู้สึกปลอดภัย ถอดซักได้ทั้งใบ",
  },
];

const REVIEWERS = [
  "คุณนุ่น",
  "คุณบอส",
  "คุณมายด์",
  "คุณต้น",
  "คุณแพร",
  "คุณโอ๊ต",
  "คุณฝน",
  "คุณเจมส์",
  "คุณปุ้ย",
  "คุณเอิร์ธ",
  "คุณพลอย",
];

const REVIEW_TEXT: Record<Pet, Record<ProductType, string[]>> = {
  cat: {
    dry: [
      "น้องกินเกลี้ยงชามทุกมื้อ ขนนุ่มขึ้นชัดเจน",
      "เม็ดขนาดพอดี กลิ่นไม่แรง เจ้าเหมียวชอบมาก",
      "ซื้อซ้ำเป็นถุงที่สามแล้ว ส่งไวแพ็คดีค่ะ",
    ],
    wet: [
      "เปิดซองปุ๊บน้องวิ่งมาเลย ชอบมากค่ะ",
      "เนื้อเยอะ ไม่เหลวเกินไป แมวที่บ้านกินหมด",
      "ใช้ผสมอาหารเม็ด น้องกินน้ำเยอะขึ้น",
    ],
    treat: [
      "ของโปรดของน้องเลย ได้ยินเสียงฉีกซองก็มา",
      "ใช้ตอนตัดเล็บ น้องนิ่งขึ้นเยอะมาก",
      "ราคาคุ้ม แพ็คใหญ่ใช้ได้นาน",
    ],
    toy: [
      "น้องเล่นได้ทั้งวันไม่มีเบื่อ คุ้มมาก",
      "วัสดุดี แข็งแรง โดนตะปบทุกวันยังไม่พัง",
      "ช่วยให้น้องได้ออกกำลัง หลับสบายขึ้น",
    ],
    accessory: [
      "ใช้งานง่าย วัสดุดีกว่าที่คิดไว้",
      "น้องชอบมาก ใช้ทุกวันตั้งแต่วันแรก",
      "ดีไซน์สวย เข้ากับบ้าน ทำความสะอาดง่าย",
    ],
  },
  dog: {
    dry: [
      "น้องหมากินดี ถ่ายเป็นก้อนสวย",
      "เม็ดกรอบ หอม น้องรอหน้าชามทุกเช้า",
      "ขนเงาขึ้นหลังกินได้ประมาณหนึ่งเดือน",
    ],
    wet: [
      "หอมมาก น้องกินจนเลียชาม",
      "ใช้คลุกข้าว น้องที่กินยากกลับมากินดี",
      "เนื้อชิ้นใหญ่ ของจริงตามรูป",
    ],
    treat: [
      "ใช้เป็นรางวัลตอนฝึก ได้ผลดีมาก",
      "น้องเคี้ยวเพลิน ไม่แข็งเกินไป",
      "ไม่มีกลิ่นแรง ไม่ทำให้มือเลอะ",
    ],
    toy: [
      "กัดเล่นทุกวัน ยังไม่ขาด ทนจริง",
      "น้องวิ่งไล่คาบมาให้โยนซ้ำไม่หยุด",
      "ช่วยระบายพลังน้องได้ดี บ้านไม่พังอีกเลย",
    ],
    accessory: [
      "คุณภาพดี ใช้งานได้จริง คุ้มราคา",
      "น้องหมาชอบมาก ใช้ทุกวัน",
      "ซักง่าย แห้งไว ไม่มีกลิ่นอับ",
    ],
  },
};

const DATES = [
  "12 ส.ค. 2569",
  "3 ก.ย. 2569",
  "21 ก.ค. 2569",
  "28 ส.ค. 2569",
  "9 ก.ย. 2569",
  "15 มิ.ย. 2569",
];

function buildReviews(seed: Seed, index: number): Review[] {
  const count = index % 2 === 0 ? 3 : 2;
  const texts = REVIEW_TEXT[seed.pet][seed.type];
  const reviews: Review[] = [];
  for (let i = 0; i < count; i++) {
    reviews.push({
      name: REVIEWERS[(index * 3 + i) % REVIEWERS.length],
      stars: (index + i) % 3 === 2 ? 4 : 5,
      text: texts[(index + i) % texts.length],
      date: DATES[(index + i * 2) % DATES.length],
    });
  }
  return reviews;
}

export const PRODUCTS: Product[] = seeds.map((s, i) => ({
  ...s,
  reviews: buildReviews(s, i),
  reviewCount: s.popularity * 3 + (i % 7) * 4 + 11,
}));

const BY_SLUG = new Map(PRODUCTS.map((p) => [p.slug, p]));

export function getProduct(slug: string): Product | undefined {
  return BY_SLUG.get(slug);
}

export function lowestPrice(p: Pick<Product, "sizes">): number {
  return Math.min(...p.sizes.map((s) => s.price));
}

/** The smallest (cheapest) size of a product. */
export function smallestSize(p: Pick<Product, "sizes">): Size {
  return p.sizes.reduce((min, s) => (s.price < min.price ? s : min), p.sizes[0]);
}

export function productImage(slug: string): string {
  return `/images/products/${slug}.jpg`;
}

export function seedStock(): Record<string, number> {
  return Object.fromEntries(PRODUCTS.map((p) => [p.slug, p.stock]));
}

export function withStock(p: Product, stock: Record<string, number>): Product {
  const s = stock[p.slug];
  return s === undefined ? p : { ...p, stock: s };
}

export function byPopularity(a: Product, b: Product): number {
  return b.popularity - a.popularity;
}

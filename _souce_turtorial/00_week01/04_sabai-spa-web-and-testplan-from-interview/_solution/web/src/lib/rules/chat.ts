// parser ล้วนของแชต · ไม่แตะฐานข้อมูล ไม่อ่านเวลา ไม่สุ่ม รับค่าเข้าเท่าไหร่ คืนผลเดิมเสมอ (NFR-14)
import { addDays, isValidDateString, isValidTimeString } from '@/lib/date';
import type { ChatState, Locale, ServiceId } from '@/types';
import { lastBookableDate } from '@/lib/rules/booking-window';

/**
 * ChatState ที่เติม 2 ช่องที่ต้องส่งกลับไปกลับมาด้วย เพราะเซิร์ฟเวอร์ไม่เก็บ state
 * language: คำตอบอย่าง "2" หรือ "S01" ไม่บอกภาษา จึงคงภาษาของบทสนทนาไว้
 * quotedPayAtShop: ยอดที่ลูกค้าเห็นล่าสุด ส่งให้ createBooking ตรวจ price-changed
 */
export interface ChatFlowState extends ChatState {
  language?: Locale;
  quotedPayAtShop?: number;
}

/** บริการที่จองผ่านแชตได้ · P01 ต้องระบุรถ และ K01 ต้องเลือกคอร์ส ซึ่งอยู่นอกขอบเขต D-17 */
export const CHAT_BOOKABLE_IDS: readonly ServiceId[] = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07'];

const FLOW_STEPS: readonly ChatState['step'][] = ['service', 'date', 'time', 'party', 'guest', 'confirm'];
const MAX_NAME_LENGTH = 100;

// ---------- ทำความสะอาดข้อความ ----------

/**
 * แปลงตัวเต็มความกว้าง (１４：００) และเลขไทยเป็นตัวปกติ และตัดอักขระควบคุมที่ PostgreSQL เก็บไม่ได้
 * ไม่ใช้ normalize('NFKC') เพราะจะแยกสระอำของไทย ทำให้ "น้ำมัน" ไม่ตรงกับคำค้น
 */
export function cleanText(raw: string): string {
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ')
    .replace(/[๐-๙]/g, (c) => String(c.charCodeAt(0) - 0x0e50))
    .trim();
}

// ---------- ภาษา ----------

const HAN = /[㐀-䶿一-鿿豈-﫿]/;
/** ไม่รวม ฿ (U+0E3F) เพราะสัญลักษณ์เงินไม่บอกภาษา */
const THAI = /[ก-ฺเ-๛]/;
const NEUTRAL_LATIN = /\b(?:s0[1-7]|p01|k01)\b|\d{1,2}\s*(?:am|pm)\b|\b(?:am|pm|ok|okay)\b/gi;

/** ภาษาจากตัวอักษรในข้อความ (จีน → ไทย → อังกฤษ) · ไม่มีสัญญาณคืน null เช่น "2" หรือ "S01" */
export function detectLanguage(text: string): Locale | null {
  if (HAN.test(text)) return 'zh';
  if (THAI.test(text)) return 'th';
  return /[a-z]/i.test(text.replace(NEUTRAL_LATIN, ' ')) ? 'en' : null;
}

// ---------- เจตนา (รับข้อความที่ lowercase แล้ว) ----------

const HOURS_ANYWHERE =
  /เวลาเปิด|เวลาปิด|เวลาทำการ|เปิดกี่โมง|ปิดกี่โมง|เปิดกี่|ปิดกี่|เปิดทุกวัน|เปิดวันไหน|\bopening\b|\bopening hours\b|\bhours\b|\bwhen (?:do|are) you\b|营业|營業|开门|開門|关门|關門|打烊/;
/** คำกว้างที่นับเป็นคำถามเฉพาะตอนยังไม่ได้อยู่ในขั้นตอนจอง */
const HOURS_WHEN_IDLE = /เปิด|ปิด|กี่โมง|\bopen\b|\bclose\b|\bclosing\b|\bwhat time\b|几点|幾點/;
const PRICE =
  /ราคา|เท่าไหร่|เท่าไหร|เท่าไร|เท่าใด|กี่บาท|ค่าบริการ|เมนู|\bprices?\b|\bpricing\b|\bcosts?\b|\bhow much\b|\bmenu\b|多少钱|多少錢|价格|價格|价钱|價錢|费用|費用|收费|收費|价目|價目|菜单|菜單/;
const BOOKING = /จอง|นัด|\bbook(?:ing)?\b|\breserv(?:e|ation)\b|\bappointment\b|预约|預約|预订|預訂|订|訂/;
const GREETING = /สวัสดี|หวัดดี|\bhello\b|\bhi\b|\bhey\b|你好|您好|嗨/;
const CANCEL = /ยกเลิก|\bcancel\b|\bstop\b|取消/;
const NEGATIVE = /ไม่|\bno\b|\bnope\b|不|否/;
const AFFIRMATIVE = /ยืนยัน|ตกลง|ใช่|โอเค|จอง|\bok\b|\bokay\b|\byes\b|\byep\b|\bconfirm\b|\bbook\b|确认|確認|确定|確定|好|是|对|對/;
/** เรื่องนอกขอบเขต D-17 · รถกันคำว่า "สามารถ" และ "ที่จอดรถ" */
const REFERRAL =
  /แต้ม|เดือนเกิด|วันเกิด|บัตรของขวัญ|บัตร|(?<!สามา|จอด)รถ|รับส่ง|คอร์ส|โรงแรม|\bpoints?\b|\bbirthday\b|\bgift ?cards?\b|\bvouchers?\b|\bshuttle\b|\bpick ?up\b|\btransfer\b|\bcourses?\b|\bhotels?\b|积分|積分|生日|礼品卡|禮品卡|礼券|禮券|接送|班车|班車|疗程|療程|酒店/;

export function isHoursQuestion(text: string, inFlow: boolean): boolean {
  return HOURS_ANYWHERE.test(text) || (!inFlow && HOURS_WHEN_IDLE.test(text));
}
export const isPriceQuestion = (text: string): boolean => PRICE.test(text);
export const isBookingRequest = (text: string): boolean => BOOKING.test(text);
export const isGreeting = (text: string): boolean => GREETING.test(text);
export const isCancel = (text: string): boolean => CANCEL.test(text);
export const wantsReferral = (text: string): boolean => REFERRAL.test(text);

/** ตรวจคำปฏิเสธก่อน เพราะ "ไม่ใช่" มี "ใช่" และ "不是" มี "是" */
export function isNegative(text: string): boolean {
  return NEGATIVE.test(text);
}
export function isAffirmative(text: string): boolean {
  return !NEGATIVE.test(text) && AFFIRMATIVE.test(text);
}

// ---------- บริการ ----------

const SERVICE_CODE = /\b(s0[1-7]|p01|k01)\b/gi;
const THAI_MASSAGE = /นวดไทย|thai\s*massage|traditional\s*thai|泰式|泰国按摩|泰國按摩/;
const SERVICE_ALIASES: readonly (readonly [ServiceId, RegExp])[] = [
  ['S03', /ประคบ|compress|热敷|熱敷/],
  ['S04', /อโรมา|น้ำมัน|\baroma\b|\boil\b|精油|香薰/],
  ['S05', /เท้า|\bfoot\b|\bfeet\b|足部|足疗|足療|脚|腳/],
  ['S06', /ขัดผิว|ขัดตัว|\bscrub\b|磨砂|去角质|去角質/],
  ['S07', /ทรีตเมนต์|ทรีทเมนต์|ทรีทเมนท์|ทำหน้า|\bfacial\b|面部|护肤|護膚/],
  ['P01', /bangkok\s*relax|แพ็กเกจ|แพคเกจ|แพ็คเกจ|\bpackage\b|套餐|曼谷/],
  ['K01', /คอร์ส|\bcourses?\b|\bcontour(?:ing)?\b|กระชับสัดส่วน|疗程|療程|塑形/],
];

/** บริการทั้งหมดที่ข้อความพูดถึง · รหัสมาก่อนชื่อ · "นวดไทย" ไม่บอกนาทีได้ทั้ง S01 และ S02 */
export function matchServiceIds(text: string): ServiceId[] {
  const codes = text.match(SERVICE_CODE);
  if (codes) return [...new Set(codes.map((code) => code.toUpperCase() as ServiceId))];

  const ids: ServiceId[] = [];
  if (THAI_MASSAGE.test(text)) {
    const has60 = /(?<![\d.:])60(?!\d)/.test(text);
    const has90 = /(?<![\d.:])90(?!\d)/.test(text);
    if (has60 || !has90) ids.push('S01');
    if (has90 || !has60) ids.push('S02');
  }
  for (const [id, alias] of SERVICE_ALIASES) {
    if (alias.test(text)) ids.push(id);
  }
  return ids;
}

// ---------- ตัวเลขเป็นคำ ----------

const THAI_NUMBERS: Record<string, number> = {
  สิบสอง: 12, สิบเอ็ด: 11, สิบ: 10, เก้า: 9, แปด: 8, เจ็ด: 7, หก: 6, ห้า: 5, สี่: 4, สาม: 3, สอง: 2, หนึ่ง: 1,
};
const ZH_NUMBERS: Record<string, number> = {
  十二: 12, 十一: 11, 十: 10, 九: 9, 八: 8, 七: 7, 六: 6, 五: 5, 四: 4, 三: 3, 两: 2, 兩: 2, 二: 2, 一: 1,
};
const EN_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
const THAI_WORD = Object.keys(THAI_NUMBERS).join('|');
const ZH_WORD = Object.keys(ZH_NUMBERS).join('|');
const EN_WORD = Object.keys(EN_NUMBERS).join('|');

/** แปลงเฉพาะคำเลขที่ติดกับหน่วย จึงไม่แตะ "สามารถ" หรือคำอื่น */
function wordsToDigits(text: string): string {
  return text
    .replace(new RegExp(`(${THAI_WORD})(?=\\s*(?:คน|ท่าน|โมง|ทุ่ม))`, 'g'), (word) => String(THAI_NUMBERS[word]))
    .replace(new RegExp(`(?<=บ่าย\\s*)(${THAI_WORD})`, 'g'), (word) => String(THAI_NUMBERS[word]))
    .replace(new RegExp(`(${ZH_WORD})(?=\\s*(?:个人|個人|人|位|点|點))`, 'g'), (word) => String(ZH_NUMBERS[word]))
    .replace(
      new RegExp(`\\b(${EN_WORD})\\b(?=\\s*(?:people|persons?|pax|guests?|adults?))`, 'g'),
      (word) => String(EN_NUMBERS[word]),
    )
    .replace(new RegExp(`(?<=\\bfor\\s+)(${EN_WORD})\\b`, 'g'), (word) => String(EN_NUMBERS[word]));
}

// ---------- วันที่ ----------

export interface DateParse {
  date?: string;
  invalid?: boolean;
  rest: string;
}

const RELATIVE_DAYS: readonly (readonly [RegExp, number])[] = [
  [/大后天|大後天/, 3],
  [/day after tomorrow|มะรืน|后天|後天/, 2],
  [/\btomorrow\b|พรุ่งนี้|明天|明日/, 1],
  [/\btoday\b|วันนี้|今天|今日/, 0],
];

/** เข้าใจ 2026-06-17 และคำว่า พรุ่งนี้ / tomorrow / 明天 เทียบกับ today ที่ส่งเข้ามา */
export function parseDate(text: string, today: string): DateParse {
  const iso = /(?<!\d)(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?!\d)/.exec(text);
  if (iso) {
    const date = `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
    const rest = text.replace(iso[0], ' ');
    return isValidDateString(date) ? { date, rest } : { invalid: true, rest };
  }
  for (const [pattern, days] of RELATIVE_DAYS) {
    const match = pattern.exec(text);
    if (match) return { date: addDays(today, days), rest: text.replace(match[0], ' ') };
  }
  return { rest: text };
}

// ---------- เวลา ----------

export interface TimeParse {
  time?: string;
  invalid?: boolean;
  rest: string;
}

function clock(hour: number, minute: number): string | null {
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function timeResult(text: string, whole: string, hour: number, minute: number): TimeParse {
  const rest = text.replace(whole, ' ');
  const time = clock(hour, minute);
  return time ? { time, rest } : { invalid: true, rest };
}

/** bareNumber: ขั้นถามเวลา "14" แปลว่า 14:00 */
export function parseTime(raw: string, bareNumber = false): TimeParse {
  const text = wordsToDigits(raw);
  let m: RegExpExecArray | null;

  m = /(?<![\d:.])(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/.exec(text);
  if (m) {
    const base = Number(m[1]) % 12;
    return timeResult(text, m[0], m[3] === 'pm' ? base + 12 : base, Number(m[2] ?? 0));
  }

  m = /บ่าย\s*(\d{1,2})?\s*(?:โมง)?\s*(ครึ่ง)?/.exec(text);
  if (m) {
    const n = Number(m[1] ?? 1);
    return timeResult(text, m[0], n < 12 ? n + 12 : n, m[2] ? 30 : 0);
  }
  m = /(\d{1,2})\s*ทุ่ม\s*(ครึ่ง)?/.exec(text);
  if (m) return timeResult(text, m[0], Number(m[1]) + 18, m[2] ? 30 : 0);
  m = /(\d{1,2})\s*โมง\s*(เช้า|เย็น)?\s*(ครึ่ง)?/.exec(text);
  if (m) {
    const n = Number(m[1]);
    const afternoon = m[2] === 'เย็น' || (m[2] === undefined && n < 7);
    return timeResult(text, m[0], afternoon ? n + 12 : n, m[3] ? 30 : 0);
  }
  m = /เที่ยง\s*(ครึ่ง)?/.exec(text);
  if (m) return timeResult(text, m[0], 12, m[1] ? 30 : 0);

  // นาทีต้องติดกับ 点 และไม่ใช่จำนวนคน เช่น "2点2位" คือ 14:00 กับ 2 คน
  m = /(上午|早上|中午|下午|晚上)?\s*(\d{1,2})\s*[点點](?:(半)|(\d{1,2})分?(?![\d人位个個]))?/.exec(text);
  if (m) {
    const n = Number(m[2]);
    const afternoon = (m[1] === '下午' || m[1] === '晚上' || (m[1] === '中午' && n < 3)) && n < 12;
    return timeResult(text, m[0], afternoon ? n + 12 : n, m[3] ? 30 : Number(m[4] ?? 0));
  }

  m = /(?<![\d:.])(\d{1,2})[:.](\d{2})(?![\d:])/.exec(text);
  if (m) return timeResult(text, m[0], Number(m[1]), Number(m[2]));
  m = /(?<![\d:.])(\d{1,2})\s*(?:น\.|นาฬิกา|o'?clock\b)/.exec(text);
  if (m) return timeResult(text, m[0], Number(m[1]), 0);
  m = /\bnoon\b|中午/.exec(text);
  if (m) return timeResult(text, m[0], 12, 0);

  if (bareNumber) {
    m = /^\s*(\d{1,2})\s*$/.exec(text);
    if (m) return timeResult(text, m[0], Number(m[1]), 0);
  }
  return { rest: text };
}

// ---------- จำนวนคน ----------

/** bareNumber: ขั้นถามจำนวนคน "2" หรือ "สอง" แปลว่า 2 คน */
export function parseParty(raw: string, bareNumber = false): number | null {
  const text = wordsToDigits(raw);
  const counted =
    /(?<![\d:.])(\d{1,3})\s*(?:คน|ท่าน|people|persons?|pax|guests?|adults?|个人|個人|人|位)/.exec(text) ??
    /\bfor\s+(\d{1,3})\b/.exec(text);
  if (counted) return Number(counted[1]);
  if (/คู่|\bcouple\b|情侣|情侶|双人|雙人/.test(text)) return 2;
  if (/คนเดียว|\balone\b|\bjust me\b/.test(text)) return 1;
  if (bareNumber) {
    const trimmed = text.trim();
    if (/^\d{1,3}$/.test(trimmed)) return Number(trimmed);
    const word = THAI_NUMBERS[trimmed] ?? ZH_NUMBERS[trimmed] ?? EN_NUMBERS[trimmed];
    if (word !== undefined) return word;
  }
  return null;
}

// ---------- ชื่อและเบอร์ ----------

export interface GuestParse {
  name?: string;
  phone?: string;
  phoneInvalid: boolean;
}

const PHONE_OK = /^\d{9,10}$/;
const DIGIT_RUN = /\+?\d[\d\s\-()]*\d|\d/;
const NAME_LABELS =
  /เบอร์โทรศัพท์|เบอร์โทร|เบอร์|โทรศัพท์|โทร|ชื่อ|\bmy name is\b|\bmy phone(?: number)? is\b|\bname is\b|\bi am\b|\bi'm\b|\bphone(?: number)?\b|\bmobile\b|\btel\b|\bname\b|姓名|名字|我叫|我是|电话号码|電話號碼|电话|電話|手机号码|手機號碼|手机|手機|号码|號碼/gi;
const NAME_EDGE = /^[\s,，、:;：；.。\-]+|[\s,，、:;：；.。\-]+$/g;

/** แยกชื่อกับเบอร์ เช่น "สมชาย 081-234-5678" · รับข้อความที่ยังไม่ lowercase เพื่อคงตัวสะกดชื่อ */
export function parseGuest(text: string): GuestParse {
  const run = DIGIT_RUN.exec(text);
  const digits = run ? run[0].replace(/\D/g, '') : '';
  const name = (run ? text.replace(run[0], ' ') : text)
    .replace(NAME_LABELS, ' ')
    .replace(NAME_EDGE, '')
    .replace(/\s+/g, ' ')
    .slice(0, MAX_NAME_LENGTH)
    .trim();
  return {
    name: name || undefined,
    phone: PHONE_OK.test(digits) ? digits : undefined,
    phoneInvalid: run !== null && !PHONE_OK.test(digits),
  };
}

/** เบอร์ที่แนบมากับข้อความในขั้นอื่น · ไม่นับเลขชุดสั้นกว่า 9 หลัก */
export function findPhone(text: string): string | undefined {
  const digits = /\+?\d[\d\s\-()]{7,}\d/.exec(text)?.[0].replace(/\D/g, '') ?? '';
  return PHONE_OK.test(digits) ? digits : undefined;
}

// ---------- รวมทุกช่องของการจอง ----------

export interface BookingSlots {
  date?: string;
  dateInvalid?: boolean;
  time?: string;
  timeInvalid?: boolean;
  party?: number;
  phone?: string;
}

/** อ่านจากข้อความเดียวโดยตัดส่วนที่ใช้แล้วออก เพื่อไม่ให้เลขในวันที่ เบอร์ หรือนาทีของบริการถูกอ่านเป็นคนหรือเวลา */
export function parseBookingSlots(text: string, step: ChatState['step'], today: string): BookingSlots {
  const withoutService = text
    .replace(SERVICE_CODE, ' ')
    .replace(/(?<![\d:.])(?:60|90)\s*(?:นาที|min(?:ute)?s?\b|分钟|分鐘)/g, ' ');
  const date = parseDate(withoutService, today);
  const phone = findPhone(date.rest);
  const withoutPhone = phone ? date.rest.replace(/\+?\d[\d\s\-()]{7,}\d/, ' ') : date.rest;
  const time = parseTime(withoutPhone, step === 'time');
  const party = parseParty(time.rest, step === 'party');
  return {
    date: date.date,
    dateInvalid: date.invalid,
    time: time.time,
    timeInvalid: time.invalid,
    party: party ?? undefined,
    phone,
  };
}

// ---------- กฎที่แจ้งได้ก่อนถึงขั้นคิดราคา ----------

/** BR-03, BR-04 แบบเดียวกับ loadAndQuote · ตัวตัดสินจริงยังเป็น loadAndQuote และ createBooking */
export function bookingDateProblem(date: string, today: string): 'same-day-call' | 'date-out-of-range' | null {
  if (date <= today) return 'same-day-call';
  if (date > lastBookableDate(today)) return 'date-out-of-range';
  return null;
}

// ---------- state จาก client ----------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * state มาจาก client จึงเชื่อไม่ได้ · ค่าที่ผิดรูปแบบทิ้งไปแล้วถามใหม่ ไม่ throw
 * กฎจริงทุกข้อยังตรวจที่ loadAndQuote และ createBooking
 */
export function normalizeChatState(raw: unknown): ChatFlowState {
  if (!isRecord(raw) || !FLOW_STEPS.includes(raw.step as ChatState['step'])) return { step: 'idle' };
  const state: ChatFlowState = { step: raw.step as ChatState['step'] };
  if (CHAT_BOOKABLE_IDS.includes(raw.serviceId as ServiceId)) state.serviceId = raw.serviceId as ServiceId;
  if (isValidDateString(raw.date)) state.date = raw.date;
  if (isValidTimeString(raw.time)) state.time = raw.time;
  if (Number.isInteger(raw.partySize) && (raw.partySize as number) >= 1 && (raw.partySize as number) <= 6) {
    state.partySize = raw.partySize as number;
  }
  if (typeof raw.guestName === 'string' && raw.guestName.trim()) {
    state.guestName = cleanText(raw.guestName).slice(0, MAX_NAME_LENGTH);
  }
  if (typeof raw.guestPhone === 'string' && PHONE_OK.test(raw.guestPhone)) state.guestPhone = raw.guestPhone;
  if (raw.language === 'th' || raw.language === 'en' || raw.language === 'zh') state.language = raw.language;
  if (typeof raw.quotedPayAtShop === 'number' && Number.isFinite(raw.quotedPayAtShop)) {
    state.quotedPayAtShop = raw.quotedPayAtShop;
  }
  return state;
}

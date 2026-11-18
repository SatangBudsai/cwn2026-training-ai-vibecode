// helper ล้วนของ Wallet คอร์ส และ Gift Card · ไม่แตะฐานข้อมูล
import { randomInt } from 'node:crypto';
import { a4 } from '@/i18n/a4';
import { format } from '@/i18n/locales';
import { ApiError } from '@/lib/errors';
import { formatBaht, formatDate } from '@/lib/format';
import { numericToBaht } from '@/lib/money';
import { courseValidOn, giftCardValidOn } from '@/lib/pricing/rules';
import type {
  BodyPhoto,
  CourseSummary,
  DeliveryChannel,
  GiftCardDesign,
  GiftCardSummary,
  I18nText,
  Locale,
  WaistPoint,
} from '@/types';

export const COURSE_SERVICE_ID = 'K01';
/** FR-37: 10 แถม 1 */
export const COURSE_TOTAL_SESSIONS = 11;
/** BR-40, BR-45 */
export const COURSE_VALID_DAYS = 180;
/** BR-44, BR-45 */
export const GIFT_CARD_VALID_DAYS = 365;

const GIFT_CARD_MIN = 500;
const GIFT_CARD_MAX = 10000;
const RECIPIENT_MAX_LENGTH = 200;
const MESSAGE_MAX_LENGTH = 500;

const DESIGN_IMAGE: Record<GiftCardDesign, string> = {
  ORCHID: '/brand/giftcard/gc-orchid.jpg',
  LOTUS: '/brand/giftcard/gc-lotus.jpg',
  GOLD: '/brand/giftcard/gc-gold.jpg',
};

// ---------- Gift Card ----------

/** BR-41, 42, 43: จำนวนเต็ม 500–10000 · ข้อความต้องเป็นตัวเลขล้วน จึงไม่ต้องปัดอะไร · ผิดคืน null */
export function parseGiftCardAmount(value: unknown): number | null {
  let amount: number;
  if (typeof value === 'number') {
    amount = value;
  } else if (typeof value === 'string' && /^[1-9]\d*$/.test(value.trim())) {
    amount = Number(value.trim());
  } else {
    return null;
  }
  if (!Number.isInteger(amount) || amount < GIFT_CARD_MIN || amount > GIFT_CARD_MAX) return null;
  return amount;
}

export function isGiftCardDesign(value: unknown): value is GiftCardDesign {
  return value === 'ORCHID' || value === 'LOTUS' || value === 'GOLD';
}

export function isDeliveryChannel(value: unknown): value is DeliveryChannel {
  return value === 'LINE' || value === 'EMAIL';
}

export function giftCardImagePath(design: GiftCardDesign): string {
  return DESIGN_IMAGE[design];
}

export interface GiftCardInput {
  amount: number;
  design: GiftCardDesign;
  channel: DeliveryChannel;
  recipient: string | null;
  message: string | null;
}

function optionalText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > maxLength) throw new ApiError('validation');
  return value.trim() || null;
}

/** ตรวจ body ของ POST /api/gift-cards ตามลำดับ มูลค่า → ลาย → ช่องทาง */
export function parseGiftCardRequest(body: unknown): GiftCardInput {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new ApiError('validation');
  const b = body as Record<string, unknown>;
  const amount = parseGiftCardAmount(b.amount);
  if (amount === null) throw new ApiError('giftcard-amount-invalid');
  if (!isGiftCardDesign(b.design)) throw new ApiError('giftcard-design-invalid');
  if (!isDeliveryChannel(b.channel)) throw new ApiError('giftcard-channel-invalid');
  return {
    amount,
    design: b.design,
    channel: b.channel,
    recipient: optionalText(b.recipient, RECIPIENT_MAX_LENGTH),
    message: optionalText(b.message, MESSAGE_MAX_LENGTH),
  };
}

// ไม่มี 0 O 1 I กันอ่านผิดเวลาพิมพ์รหัสเอง
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 10;

/** ความไม่ซ้ำรับประกันโดย UNIQUE ของ gift_cards.code และการสุ่มใหม่ใน service */
export function randomGiftCardCode(): string {
  let code = 'GIFT-';
  for (let i = 0; i < CODE_LENGTH; i += 1) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export interface GiftCardRow {
  code: string;
  design: GiftCardDesign;
  initial_value: string;
  balance: string;
  purchased_on: string;
  expires_on: string;
  delivery_channel: DeliveryChannel;
}

export function toGiftCardSummary(row: GiftCardRow, today: string): GiftCardSummary {
  const balance = numericToBaht(row.balance);
  const expired = !giftCardValidOn(row.purchased_on, today);
  return {
    code: row.code,
    design: row.design,
    imagePath: giftCardImagePath(row.design),
    initialValue: numericToBaht(row.initial_value),
    balance,
    purchasedOn: row.purchased_on,
    expiresOn: row.expires_on,
    expired,
    usable: !expired && balance > 0,
    channel: row.delivery_channel,
    paymentStatus: 'SIMULATED',
  };
}

/** FR-48, E253: ข้อความ "ส่ง" แบบจำลอง ไม่ใส่ recipient และ message เพื่อคงภาษาเดียวตาม request (NFR-07) */
export function simulatedGiftCardMessage(card: GiftCardSummary, locale: Locale): string {
  const m = a4[locale];
  const design: Record<GiftCardDesign, string> = {
    ORCHID: m.designOrchid,
    LOTUS: m.designLotus,
    GOLD: m.designGold,
  };
  return format(m.giftCardSimulated, {
    amount: formatBaht(card.initialValue, locale),
    design: design[card.design],
    channel: card.channel === 'LINE' ? m.channelLine : m.channelEmail,
    code: card.code,
    expires: formatDate(card.expiresOn, locale),
  });
}

// ---------- คอร์ส ----------

export function courseRemaining(total: number, used: number, reserved: number): number {
  return total - used - reserved;
}

export interface CourseRow {
  id: string;
  name_th: string;
  name_en: string;
  name_zh: string;
  total_sessions: number;
  used_sessions: number;
  reserved_sessions: number;
  purchased_on: string;
  expires_on: string;
  price_paid: string;
}

export function toCourseSummary(row: CourseRow, today: string): CourseSummary {
  const remaining = courseRemaining(row.total_sessions, row.used_sessions, row.reserved_sessions);
  const serviceName: I18nText = { th: row.name_th, en: row.name_en, zh: row.name_zh };
  return {
    id: row.id,
    serviceId: COURSE_SERVICE_ID,
    serviceName,
    totalSessions: row.total_sessions,
    usedSessions: row.used_sessions,
    reservedSessions: row.reserved_sessions,
    remaining,
    purchasedOn: row.purchased_on,
    expiresOn: row.expires_on,
    expired: !courseValidOn(row.purchased_on, today),
    usedUp: remaining <= 0,
    pricePaid: numericToBaht(row.price_paid),
  };
}

// ---------- รอบเอว ----------

/** '79.5' → 795 */
export function cmToTenths(cm: string): number {
  const [whole, frac = ''] = cm.split('.');
  return Number(whole) * 10 + Number(frac.padEnd(1, '0').slice(0, 1));
}

/** 40 → '4.0' · −15 → '-1.5' */
export function tenthsToCm(tenths: number): string {
  const abs = Math.abs(tenths);
  return `${tenths < 0 ? '-' : ''}${Math.floor(abs / 10)}.${abs % 10}`;
}

/** FR-43: จุดแรก − จุดสุดท้าย คิดเป็นสิบเท่า ไม่ใช้ float · น้อยกว่า 2 จุดคืน null */
export function reducedCm(points: WaistPoint[]): string | null {
  if (points.length < 2) return null;
  return tenthsToCm(cmToTenths(points[0].cm) - cmToTenths(points[points.length - 1].cm));
}

// ---------- รูป before/after ----------

/** 'public/placeholder/x.jpg' → '/placeholder/x.jpg' */
export function photoUrl(filePath: string): string {
  const path = filePath.replace(/^\/?public(?=\/)/, '');
  return path.startsWith('/') ? path : `/${path}`;
}

export function toBodyPhoto(row: { kind: 'BEFORE' | 'AFTER'; taken_on: string; file_path: string }): BodyPhoto {
  const url = photoUrl(row.file_path);
  return { kind: row.kind, takenOn: row.taken_on, url, placeholder: url.startsWith('/placeholder/') };
}

// ฟังก์ชันล้วนของ A2 · ไม่แตะฐานข้อมูล · หน้าจอง แชต และการยืนยันใช้ชุดเดียวกัน (FR-27, NFR-11)
// คิดเป็นสตางค์ภายใน (DESIGN 3.3) · รับและคืนบาท
import { diffDays, monthOf, yearOf } from '@/lib/date';
import { ApiError } from '@/lib/errors';
import { bahtToSatang, satangToBahtFloor } from '@/lib/money';
import type { DiscountSource, PriceLines, ServiceKind, Tier } from '@/types';
import { runtimeProfile } from '@/lib/env';

const GOLD_FROM_BAHT = 10000;
const PLATINUM_FROM_BAHT = 30000;
const GROUP_DISCOUNT_FROM_PEOPLE = 4;
const POINTS_PER_SET = 100;
const BAHT_PER_SET = 50;
const FREE_SHUTTLE_MAX_TENTHS = 50;
const SHUTTLE_MAX_TENTHS = 150;
const SHUTTLE_FEE_PER_CAR_BAHT = 300;
const PEOPLE_PER_CAR = 4;
const COURSE_VALID_DAYS = 180;
const GIFT_CARD_VALID_DAYS = 365;

export interface PriceInput {
  /** ราคาต่อคน (บาท) */
  unitPriceBaht: number;
  partySize: number;
  kind: ServiceKind;
  /** จองด้วยคอร์ส: ราคาเต็ม ฿0 */
  isCourseBooking: boolean;
  /** ยอดสะสมของผู้จอง · null = แขก */
  lifetimeSpendBaht: number | null;
  /** ผ่าน birthdayEligibility และลูกค้ากดเลือกแล้ว */
  birthdayApplies: boolean;
  /** ทวีคูณของ 100 · ตรวจ BR-18, 19, 20 ในฟังก์ชันนี้ */
  pointsToRedeem: number;
  pointsBalance: number;
  /** ระยะที่ผ่าน parseDistanceKm แล้ว เป็นสิบเท่าของ กม. (5.1 → 51) · null = ไม่ใช้รถ */
  distanceTenths: number | null;
  /** ยอดในบัตรที่ผ่านการตรวจแล้ว · null = ไม่ใช้บัตร */
  giftCardBalanceBaht: number | null;
}

/**
 * BR-29: % ที่มากที่สุด 1 อัน · เท่ากันให้ TIER มาก่อน GROUP
 * BR-30: มีเฉพาะ S01–S07 จึงตัด P01 และ K01 ออก
 */
function pickDiscount(input: PriceInput): { percent: PriceLines['discountPercent']; source: DiscountSource } {
  if (input.kind !== 'SERVICE' || input.isCourseBooking) return { percent: 0, source: 'NONE' };
  if (input.birthdayApplies) return { percent: 20, source: 'BIRTHDAY' };
  const tier = input.lifetimeSpendBaht === null ? null : tierFromSpend(input.lifetimeSpendBaht);
  if (tier === 'Platinum') return { percent: 10, source: 'TIER' };
  if (input.partySize >= GROUP_DISCOUNT_FROM_PEOPLE) return { percent: 10, source: 'GROUP' };
  if (tier === 'Gold') return { percent: 5, source: 'TIER' };
  return { percent: 0, source: 'NONE' };
}

/** BR-18, 19, 20 · คืนส่วนลดเป็นบาท */
function redeemDiscount(input: PriceInput, afterPercentBaht: number): number {
  const points = input.pointsToRedeem;
  if (points === 0) return 0;
  if (input.lifetimeSpendBaht === null) throw new ApiError('points-login-required');
  if (points < 0) throw new ApiError('validation');
  if (points < POINTS_PER_SET || input.pointsBalance < POINTS_PER_SET) throw new ApiError('points-not-enough');
  if (points % POINTS_PER_SET !== 0) throw new ApiError('points-not-multiple');
  if (points > input.pointsBalance) throw new ApiError('points-not-enough');
  const discount = (points / POINTS_PER_SET) * BAHT_PER_SET;
  if (discount > afterPercentBaht) throw new ApiError('points-exceed-service');
  return discount;
}

/** จำนวนชุดสูงสุดที่แลกได้: แต้มต้องพอ และส่วนลดต้องไม่เกินยอดหลัง % (BR-18, 19, 20) */
export function maxRedeemSets(pointsBalance: number, afterPercentBaht: number): number {
  return Math.min(Math.floor(pointsBalance / POINTS_PER_SET), Math.floor(afterPercentBaht / BAHT_PER_SET));
}

/** ราคา 5 ขั้นตาม BR-31 · ไม่ตรวจจำนวนคนเอง (E66) · ผิดกฎ throw ApiError */
function netAfterDeductions(fullSatang: number, percent: number, pointsBaht: number, afterPercentBaht: number): number {
  if (runtimeProfile() === '0') return afterPercentBaht - pointsBaht;
  return roundDownBaht(Math.floor(((fullSatang - bahtToSatang(pointsBaht)) * (100 - percent)) / 100));
}

export function quote(input: PriceInput): PriceLines {
  // ขั้น 1
  const fullSatang = input.isCourseBooking ? 0 : bahtToSatang(input.unitPriceBaht) * input.partySize;
  const fullPrice = roundDownBaht(fullSatang);

  // ขั้น 2 · ปัดเศษที่นี่ขั้นเดียว (D-10)
  const { percent, source } = pickDiscount(input);
  const afterPercentBaht = roundDownBaht(Math.floor((fullSatang * (100 - percent)) / 100));

  // ขั้น 3
  const pointsDiscount = redeemDiscount(input, afterPercentBaht);
  const serviceNet = netAfterDeductions(fullSatang, percent, pointsDiscount, afterPercentBaht);

  // ขั้น 4
  const shuttle =
    input.distanceTenths === null
      ? { cars: 0, feeBaht: 0 }
      : shuttleFee(input.distanceTenths, input.partySize, input.kind);
  const totalBeforeGiftCard = serviceNet + shuttle.feeBaht;

  // ขั้น 5 (BR-33)
  const giftCardAmount = Math.min(input.giftCardBalanceBaht ?? 0, totalBeforeGiftCard);

  return {
    fullPrice,
    discountPercent: percent,
    discountSource: source,
    discountAmount: fullPrice - pointsDiscount - serviceNet,
    pointsRedeemed: input.pointsToRedeem,
    pointsDiscount,
    serviceNet,
    cars: shuttle.cars,
    transportFee: shuttle.feeBaht,
    totalBeforeGiftCard,
    giftCardAmount,
    payAtShop: totalBeforeGiftCard - giftCardAmount,
  };
}

/** BR-15: ฐาน ÷ 100 ปัดลง */
export function pointsEarned(baseBaht: number): number {
  return Math.floor(baseBaht / 100);
}

/** BR-16, BR-17: ฐาน = serviceNet − Gift Card ที่ใช้ ไม่ต่ำกว่า 0 ไม่รวมค่ารถ */
export function loyaltyBase(serviceNetBaht: number, giftCardAmountBaht: number): number {
  return Math.max(0, serviceNetBaht - giftCardAmountBaht);
}

/** BR-32: สตางค์ → บาทเต็ม ปัดลง */
export function roundDownBaht(satang: number): number {
  return satangToBahtFloor(satang);
}

/** BR-21, BR-22 */
export function tierFromSpend(spendBaht: number): Tier {
  if (spendBaht >= PLATINUM_FROM_BAHT) return 'Platinum';
  if (spendBaht >= GOLD_FROM_BAHT) return 'Gold';
  return 'Silver';
}

/** FR-35: null เมื่อ Platinum */
export function nextTier(spendBaht: number): { name: 'Gold' | 'Platinum'; gap: number } | null {
  const tier = tierFromSpend(spendBaht);
  if (tier === 'Platinum') return null;
  if (tier === 'Gold') return { name: 'Platinum', gap: PLATINUM_FROM_BAHT - spendBaht };
  return { name: 'Gold', gap: GOLD_FROM_BAHT - spendBaht };
}

/** BR-38: ตรวจจากข้อความ ('5.05' ✗ ห้ามปัด · '-0.1' ✗) คืนสิบเท่าของ กม. · ผิด throw distance-invalid */
export function parseDistanceKm(text: string): number {
  const match = /^(\d+)(?:\.(\d))?$/.exec(text.trim());
  if (!match) throw new ApiError('distance-invalid');
  return Number(match[1]) * 10 + Number(match[2] ?? '0');
}

/** BR-34–37 · เกิน 15.0 throw distance-too-far · cars นับตามคนเสมอแม้ค่ารถฟรี (E177, B13) */
export function shuttleFee(distanceTenths: number, partySize: number, kind: ServiceKind): { cars: number; feeBaht: number } {
  if (distanceTenths > SHUTTLE_MAX_TENTHS) throw new ApiError('distance-too-far');
  const cars = Math.ceil(partySize / PEOPLE_PER_CAR);
  const free = kind === 'PACKAGE' || distanceTenths <= FREE_SHUTTLE_MAX_TENTHS;
  return { cars, feeBaht: free ? 0 : cars * SHUTTLE_FEE_PER_CAR_BAHT };
}

/** BR-25–28: เดือนของวันนัด · ปีปฏิทินของวันนัด · S01–S07 เท่านั้น */
export function birthdayEligibility(input: {
  birthDate: string | null;
  appointmentDate: string;
  kind: ServiceKind;
  /** ปีที่ใช้สิทธิ์แล้วและยังไม่คืน */
  usedYears: number[];
}): { eligible: boolean; reason: 'not-birthday-month' | 'already-used' | 'service-not-eligible' | 'guest' | null } {
  if (input.birthDate === null) return { eligible: false, reason: 'guest' };
  if (input.kind !== 'SERVICE') return { eligible: false, reason: 'service-not-eligible' };
  if (monthOf(input.birthDate) !== monthOf(input.appointmentDate)) return { eligible: false, reason: 'not-birthday-month' };
  if (input.usedYears.includes(yearOf(input.appointmentDate))) return { eligible: false, reason: 'already-used' };
  return { eligible: true, reason: null };
}

/** BR-40, BR-45: วันซื้อเป็นวันที่ 0 ใช้ได้ถึงวันที่ 180 ตรวจจากวันนัด */
export function courseValidOn(purchasedOn: string, appointmentDate: string): boolean {
  return diffDays(purchasedOn, appointmentDate) <= COURSE_VALID_DAYS;
}

/** BR-44, BR-45: วันซื้อเป็นวันที่ 0 ใช้ได้ถึงวันที่ 365 ตรวจจากวันจอง (D-06) */
export function giftCardValidOn(purchasedOn: string, useDate: string): boolean {
  return diffDays(purchasedOn, useDate) <= GIFT_CARD_VALID_DAYS;
}

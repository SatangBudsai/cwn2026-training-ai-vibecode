// กฎวิเคราะห์ผิวแบบตายตัว (FR-75, A-26) · ฟังก์ชันล้วน ไม่แตะ DOM ไม่สุ่ม ไม่เรียกบริการภายนอก (NFR-14)
import type { I18nText, ServiceId } from '@/types';

export type SkinServiceId = Extract<ServiceId, 'S07' | 'S06' | 'S04'>;
export type SkinBand = 'low' | 'mid' | 'high';

export interface SkinRule {
  band: SkinBand;
  /** ขอบล่างของช่วง รวมค่านี้ */
  min: number;
  /** ขอบบนของช่วง รวมค่านี้ */
  max: number;
  serviceId: SkinServiceId;
  reason: I18nText;
}

export interface SkinRecommendation {
  brightness: number;
  band: SkinBand;
  serviceId: SkinServiceId;
  reason: I18nText;
}

export const MAX_BRIGHTNESS = 255;

/** ตารางร่างของทีม (A-26) · ครอบคลุม 0–255 ไม่มีช่องว่าง */
export const SKIN_TABLE: readonly SkinRule[] = [
  {
    band: 'low',
    min: 0,
    max: 84,
    serviceId: 'S07',
    reason: {
      th: 'ภาพมีความสว่างเฉลี่ยน้อย เราแนะนำทรีตเมนต์หน้าสมุนไพรที่เน้นความชุ่มชื้นและความผ่องใสอย่างอ่อนโยน',
      en: 'Your photo has a low average brightness, so we suggest the Herbal Facial for gentle hydration and a fresh glow.',
      zh: '照片的平均亮度较低，建议选择草药面部护理，温和补水并提亮气色。',
    },
  },
  {
    band: 'mid',
    min: 85,
    max: 149,
    serviceId: 'S06',
    reason: {
      th: 'ภาพมีความสว่างเฉลี่ยระดับกลาง เราแนะนำการขัดผิวสมุนไพรเพื่อให้ผิวเรียบเนียนและดูสม่ำเสมอ',
      en: 'Your photo has a medium average brightness, so we suggest the Herbal Body Scrub for smoother, more even-looking skin.',
      zh: '照片的平均亮度适中，建议选择草药身体磨砂，让肌肤更细腻、更均匀。',
    },
  },
  {
    band: 'high',
    min: 150,
    max: MAX_BRIGHTNESS,
    serviceId: 'S04',
    reason: {
      th: 'ภาพมีความสว่างเฉลี่ยสูง เราแนะนำการนวดน้ำมันอโรมาเพื่อบำรุงผิวและพักผ่อนอย่างเต็มที่',
      en: 'Your photo has a high average brightness, so we suggest the Aroma Oil Massage to nourish your skin and fully unwind.',
      zh: '照片的平均亮度较高，建议选择香薰精油按摩，滋养肌肤并充分放松。',
    },
  },
];

/**
 * ความสว่างเฉลี่ย 0–255 จากข้อมูล RGBA ด้วยสูตรจำนวนเต็ม
 * ต่อพิกเซล 299R + 587G + 114B · หารรวมด้วย 1000 × จำนวนพิกเซล แล้วปัดลง
 * ไม่นับพิกเซลโปร่งใสทั้งหมด และไม่นับเศษท้ายข้อมูลที่ไม่ครบ 4 ช่อง · ไม่มีพิกเซลให้นับคืน 0
 */
export function brightnessFromPixels(rgba: ArrayLike<number>): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) continue;
    sum += 299 * rgba[i] + 587 * rgba[i + 1] + 114 * rgba[i + 2];
    count += 1;
  }
  return count === 0 ? 0 : Math.floor(sum / (1000 * count));
}

/** เทียบตารางร่าง · ค่าที่อยู่นอกช่วงถูกจำกัดให้อยู่ใน 0–255 และปัดลงเป็นจำนวนเต็มก่อนเทียบ */
export function classifySkin(brightness: number): SkinRecommendation {
  const value = Number.isFinite(brightness) ? Math.min(MAX_BRIGHTNESS, Math.max(0, Math.floor(brightness))) : 0;
  const rule = SKIN_TABLE.find((r) => value >= r.min && value <= r.max) ?? SKIN_TABLE[0];
  return { brightness: value, band: rule.band, serviceId: rule.serviceId, reason: rule.reason };
}

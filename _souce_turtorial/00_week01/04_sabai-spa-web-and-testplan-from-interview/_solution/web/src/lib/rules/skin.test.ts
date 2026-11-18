import { describe, expect, it } from 'vitest';
import { brightnessFromPixels, classifySkin, MAX_BRIGHTNESS, SKIN_TABLE } from './skin';

const THAI = /[฀-๿]/;

function solid(r: number, g: number, b: number, count = 4, a = 255): Uint8ClampedArray {
  const data = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < data.length; i += 4) data.set([r, g, b, a], i);
  return data;
}

describe('brightnessFromPixels', () => {
  it('ขาวล้วนได้ 255 และดำล้วนได้ 0', () => {
    expect(brightnessFromPixels(solid(255, 255, 255))).toBe(255);
    expect(brightnessFromPixels(solid(0, 0, 0))).toBe(0);
  });

  it('ใช้น้ำหนัก 299, 587, 114 แล้วปัดลง', () => {
    expect(brightnessFromPixels(solid(255, 0, 0))).toBe(76);
    expect(brightnessFromPixels(solid(0, 255, 0))).toBe(149);
    expect(brightnessFromPixels(solid(0, 0, 255))).toBe(29);
  });

  it('เฉลี่ยทุกพิกเซลแล้วปัดลงเป็นจำนวนเต็ม', () => {
    expect(brightnessFromPixels(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]))).toBe(127);
  });

  it('ไม่นับพิกเซลโปร่งใสทั้งหมด', () => {
    expect(brightnessFromPixels(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 0]))).toBe(255);
    expect(brightnessFromPixels(solid(200, 200, 200, 4, 0))).toBe(0);
  });

  it('ข้อมูลว่างคืน 0 และเศษท้ายที่ไม่ครบ 4 ช่องไม่ถูกนับ', () => {
    expect(brightnessFromPixels(new Uint8ClampedArray(0))).toBe(0);
    expect(brightnessFromPixels(new Uint8ClampedArray([100, 100, 100, 255, 255, 255]))).toBe(100);
  });

  it('รับภาพ 64×64 ได้ผลตรงกับค่าสีเดียว', () => {
    expect(brightnessFromPixels(solid(120, 120, 120, 64 * 64))).toBe(120);
  });
});

describe('classifySkin', () => {
  it.each([
    [0, 'S07', 'low'],
    [84, 'S07', 'low'],
    [85, 'S06', 'mid'],
    [149, 'S06', 'mid'],
    [150, 'S04', 'high'],
    [255, 'S04', 'high'],
  ])('ความสว่าง %i ได้ %s', (brightness, serviceId, band) => {
    const result = classifySkin(brightness);
    expect(result.serviceId).toBe(serviceId);
    expect(result.band).toBe(band);
    expect(result.brightness).toBe(brightness);
  });

  it('จำกัดค่านอกช่วงและค่าที่ไม่ใช่ตัวเลข', () => {
    expect(classifySkin(-5).brightness).toBe(0);
    expect(classifySkin(999).brightness).toBe(255);
    expect(classifySkin(Number.NaN).serviceId).toBe('S07');
    expect(classifySkin(84.9).serviceId).toBe('S07');
  });

  it('ตารางครอบคลุม 0–255 ต่อเนื่องไม่มีช่องว่าง', () => {
    expect(SKIN_TABLE[0].min).toBe(0);
    expect(SKIN_TABLE[SKIN_TABLE.length - 1].max).toBe(MAX_BRIGHTNESS);
    for (let i = 1; i < SKIN_TABLE.length; i += 1) {
      expect(SKIN_TABLE[i].min).toBe(SKIN_TABLE[i - 1].max + 1);
    }
  });

  it('เหตุผลครบ 3 ภาษา และภาษาอังกฤษกับจีนไม่มีตัวอักษรไทย', () => {
    for (const rule of SKIN_TABLE) {
      expect(rule.reason.th).toMatch(THAI);
      expect(rule.reason.en.length).toBeGreaterThan(0);
      expect(rule.reason.en).not.toMatch(THAI);
      expect(rule.reason.zh.length).toBeGreaterThan(0);
      expect(rule.reason.zh).not.toMatch(THAI);
    }
  });
});

describe('ผลซ้ำได้ (NFR-14)', () => {
  it('รันข้อมูลเดิม 20 รอบได้ผลเหมือนกันทุกตัวอักษร', () => {
    const pixels = new Uint8ClampedArray(64 * 64 * 4);
    for (let i = 0; i < pixels.length; i += 1) pixels[i] = (i * 31 + 7) % 256;
    const first = JSON.stringify(classifySkin(brightnessFromPixels(pixels)));
    for (let round = 0; round < 20; round += 1) {
      expect(JSON.stringify(classifySkin(brightnessFromPixels(pixels)))).toBe(first);
    }
  });
});

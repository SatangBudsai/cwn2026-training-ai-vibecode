// จัดนักบำบัดและหารอบว่าง · ฟังก์ชันล้วน ไม่แตะฐานข้อมูล
// ผลนี้ใช้แสดงผลและเลือกคนเท่านั้น EXCLUDE ของฐานข้อมูลเป็นด่านสุดท้าย (DESIGN ข้อ 4)
import { bangkokInstant } from '@/lib/date';
import { generateSlots } from '@/lib/rules/slots';
import type { AvailabilitySlot, TherapistId } from '@/types';

export interface RatedTherapist {
  id: TherapistId;
  /** คะแนนปัดแล้ว (BR-48) · null = ไม่มีรีวิว (BR-49) */
  rating: number | null;
}

/** ช่วงเวลาแบบ [ ) เป็น epoch ms */
export interface TimeSpan {
  start: number;
  end: number;
}

export interface BusySpan extends TimeSpan {
  therapistId: string;
}

export interface DayOccupancy {
  /** คิวที่ยังกันรอบ (slot_active) */
  therapists: BusySpan[];
  /** Couple Suite ที่ยังไม่ถูกยกเลิก */
  suite: TimeSpan[];
}

/** [ ) จึงต่อคิวกันพอดีได้ เช่น 14:00–15:00 กับ 15:00–16:00 (BR-05, BR-07) */
export function spansOverlap(a: TimeSpan, b: TimeSpan): boolean {
  return a.start < b.end && b.start < a.end;
}

/** ลำดับ "ใครก็ได้": คะแนนปัดแล้วมากไปน้อย · 0 รีวิวหลังสุด · เท่ากันรหัสน้อยกว่า (FR-08, FR-09) */
export function rankTherapists<T extends RatedTherapist>(therapists: readonly T[]): T[] {
  const tenths = (rating: number | null) => (rating === null ? -1 : Math.round(rating * 10));
  return [...therapists].sort((a, b) => tenths(b.rating) - tenths(a.rating) || a.id.localeCompare(b.id));
}

/** คนว่างเรียงตามลำดับ "ใครก็ได้" */
export function freeTherapistIds(therapists: readonly RatedTherapist[], busyIds: ReadonlySet<string>): TherapistId[] {
  return rankTherapists(therapists)
    .filter((t) => !busyIds.has(t.id))
    .map((t) => t.id);
}

/** คนที่ระบบจัดให้เท่ากับจำนวนคน · คนว่างไม่พอคืน null */
export function assignTherapists(
  therapists: readonly RatedTherapist[],
  busyIds: ReadonlySet<string>,
  partySize: number,
): TherapistId[] | null {
  const free = freeTherapistIds(therapists, busyIds);
  return free.length >= partySize ? free.slice(0, partySize) : null;
}

export interface ComputeSlotsInput {
  date: string;
  durationMinutes: number;
  partySize: number;
  /** นักบำบัดที่ทำบริการนี้ได้ */
  therapists: readonly RatedTherapist[];
  /** 1 คนเลือกคนเอง: แสดงเฉพาะรอบที่คนนี้ว่าง · มีผลเฉพาะ 1 คน */
  therapistId?: string | null;
  occupancy: DayOccupancy;
}

/** เฉพาะรอบที่จองได้จริง (BR-01, BR-02, BR-05–07, BR-11, BR-12, FR-15) */
export function computeSlots(input: ComputeSlotsInput): AvailabilitySlot[] {
  const { date, durationMinutes, partySize, therapists, occupancy } = input;
  const chosen = partySize === 1 ? input.therapistId ?? null : null;
  const slots: AvailabilitySlot[] = [];

  for (const time of generateSlots(durationMinutes)) {
    const start = bangkokInstant(date, time).getTime();
    const span: TimeSpan = { start, end: start + durationMinutes * 60000 };

    if (partySize === 2 && occupancy.suite.some((s) => spansOverlap(s, span))) continue;

    const busyIds = new Set(occupancy.therapists.filter((b) => spansOverlap(b, span)).map((b) => b.therapistId));
    const autoAssignIds = assignTherapists(therapists, busyIds, partySize);
    if (!autoAssignIds) continue;

    const availableTherapistIds = freeTherapistIds(therapists, busyIds);
    if (chosen && !availableTherapistIds.includes(chosen as TherapistId)) continue;

    slots.push({ time, availableTherapistIds, autoAssignIds });
  }
  return slots;
}

// รอบเวลา · ฟังก์ชันล้วน (BR-01, BR-02)
import { isValidTimeString, minutesToTime, timeToMinutes } from '@/lib/date';

const FIRST_SLOT_MINUTES = 10 * 60;
const CLOSE_MINUTES = 22 * 60;
const SLOT_STEP_MINUTES = 30;

/** BR-01: เริ่มตั้งแต่ 10:00 และลงท้าย :00 หรือ :30 */
export function isOnSlotGrid(time: unknown): boolean {
  if (!isValidTimeString(time)) return false;
  const minutes = timeToMinutes(time);
  return minutes >= FIRST_SLOT_MINUTES && minutes % SLOT_STEP_MINUTES === 0;
}

/** BR-02: เวลาเริ่ม + นาทีบริการ ต้องไม่เกิน 22:00 */
export function endsBeforeClose(time: string, durationMinutes: number): boolean {
  return timeToMinutes(time) + durationMinutes <= CLOSE_MINUTES;
}

/** รอบนี้มีจริงสำหรับบริการที่ยาวเท่านี้ไหม (BR-01 และ BR-02) */
export function isBookableSlot(time: unknown, durationMinutes: number): boolean {
  return isOnSlotGrid(time) && endsBeforeClose(time as string, durationMinutes);
}

/** ทุกรอบของบริการที่ยาวเท่านี้ เรียงตามเวลา */
export function generateSlots(durationMinutes: number): string[] {
  const slots: string[] = [];
  for (let m = FIRST_SLOT_MINUTES; m + durationMinutes <= CLOSE_MINUTES; m += SLOT_STEP_MINUTES) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

export function slotEndTime(time: string, durationMinutes: number): string {
  return minutesToTime(timeToMinutes(time) + durationMinutes);
}

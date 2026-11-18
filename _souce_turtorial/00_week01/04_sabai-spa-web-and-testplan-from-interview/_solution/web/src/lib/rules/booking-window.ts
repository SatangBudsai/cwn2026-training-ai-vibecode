// ช่วงวันที่จองได้ (BR-03, BR-04) · ใช้ร่วมกันทุกจุดที่ตรวจวันจอง
import { addDays } from '@/lib/date';
import { runtimeProfile } from '@/lib/env';

const WINDOW_DAYS = { '0': 30, '1': 31 } as const;

export function lastBookableDate(today: string): string {
  return addDays(today, WINDOW_DAYS[runtimeProfile()]);
}

// ตารางอารมณ์ตายตัว 3 แบบตาม FR-68 · ฟังก์ชันล้วน ไม่สุ่ม ไม่เรียกบริการภายนอก (NFR-14)
import { a5Text, type A5Key } from '@/i18n/a5';
import type { I18nText, Mood, ServiceId } from '@/types';

interface MoodRule {
  serviceId: ServiceId;
  reason: A5Key;
  imagePath: string;
}

const MOOD_TABLE = new Map<unknown, MoodRule>([
  ['tired', { serviceId: 'S02', reason: 'moodReasonTired', imagePath: '/brand/misc/mood-tired.jpg' }],
  ['stress', { serviceId: 'S04', reason: 'moodReasonStress', imagePath: '/brand/misc/mood-stress.jpg' }],
  ['achy', { serviceId: 'S03', reason: 'moodReasonAchy', imagePath: '/brand/misc/mood-achy.jpg' }],
]);

export interface MoodRecommendation {
  mood: Mood;
  serviceId: ServiceId;
  reason: I18nText;
  imagePath: string;
}

/** อารมณ์นอกตารางคืน null */
export function recommendForMood(mood: unknown): MoodRecommendation | null {
  const rule = MOOD_TABLE.get(mood);
  if (!rule) return null;
  return {
    mood: mood as Mood,
    serviceId: rule.serviceId,
    reason: a5Text(rule.reason),
    imagePath: rule.imagePath,
  };
}

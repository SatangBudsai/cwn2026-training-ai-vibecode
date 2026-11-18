// แปลง query ของ /booking เป็นค่าเริ่มต้น · ค่าที่ผิดรูปถูกละทิ้ง ไม่ error
import type { ServiceId, TherapistId } from '@/types';

export interface BookingDeepLink {
  service: ServiceId | null;
  party: number;
  therapist: TherapistId | 'ANY';
  course: string | null;
}

const SERVICE_IDS: readonly string[] = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'P01', 'K01'];
const THERAPIST_IDS: readonly string[] = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06'];

export function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseBookingDeepLink(q: Record<string, string | string[] | undefined>): BookingDeepLink {
  const service = firstParam(q.service);
  const therapist = firstParam(q.therapist);
  const party = Number(firstParam(q.party));
  return {
    service: service && SERVICE_IDS.includes(service) ? (service as ServiceId) : null,
    party: Number.isInteger(party) && party >= 1 ? Math.min(party, 7) : 1,
    therapist: therapist && THERAPIST_IDS.includes(therapist) ? (therapist as TherapistId) : 'ANY',
    course: firstParam(q.course) || null,
  };
}

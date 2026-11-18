import { ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

/** process ยังทำงานอยู่ (arch-standards ข้อ 5) */
export function GET(): Response {
  return ok({ status: 'ok' });
}

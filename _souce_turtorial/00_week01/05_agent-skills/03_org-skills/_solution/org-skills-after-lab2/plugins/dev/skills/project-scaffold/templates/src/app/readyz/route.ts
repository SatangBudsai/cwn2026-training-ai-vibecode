import { prisma } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { moduleLogger } from '@/lib/logger';
import { getRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const CHECK_TIMEOUT_MS = 2_000;

/** true = ตอบทันเวลา · ioredis ของ BullMQ retry ไม่สิ้นสุด จึงต้องมี timeout ไม่งั้น /readyz ค้างตอน Redis ล่ม */
function probe(check: () => Promise<unknown>): Promise<boolean> {
  return Promise.race([
    check().then(
      () => true,
      () => false,
    ),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), CHECK_TIMEOUT_MS)),
  ]);
}

/** พร้อมรับงาน = DB + Redis (คิว BullMQ อยู่บน Redis) ตอบได้ (arch-standards ข้อ 5) */
export async function GET(): Promise<Response> {
  const [db, redis] = await Promise.all([probe(() => prisma.$queryRaw`SELECT 1`), probe(() => getRedis().ping())]);
  if (db && redis) return ok({ status: 'ready', db, redis });
  moduleLogger('health').warn({ db, redis }, 'not ready');
  return fail('NOT_READY', 'ระบบยังไม่พร้อม', 503);
}

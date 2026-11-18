import { Redis } from 'ioredis';
import { getEnv } from '@/config/env';

let client: Redis | undefined;

export function getRedis(): Redis {
  // BullMQ ต้องการ maxRetriesPerRequest: null
  client ??= new Redis(getEnv().REDIS_URL, { maxRetriesPerRequest: null });
  return client;
}

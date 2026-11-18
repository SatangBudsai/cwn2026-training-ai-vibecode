import { getEnv } from "@/config/env";

export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  db: number;
}

/** แปลง REDIS_URL เป็น connection options สำหรับ BullMQ */
export function getRedisConnectionOptions(redisUrl: string = getEnv().REDIS_URL): RedisConnectionOptions {
  const url = new URL(redisUrl);
  const dbPath = url.pathname.replace("/", "");
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    db: dbPath ? Number(dbPath) : 0,
  };
}

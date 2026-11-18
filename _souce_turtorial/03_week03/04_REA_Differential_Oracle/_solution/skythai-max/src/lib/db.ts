import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __skythaiPool: Pool | undefined;
}

export function pool(): Pool {
  if (!globalThis.__skythaiPool) {
    globalThis.__skythaiPool = new Pool({
      connectionString: process.env.DATABASE_URL ?? "postgres://skythai:skythai@localhost:5432/skythai",
      max: 10,
    });
  }
  return globalThis.__skythaiPool;
}

export async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool().query(sql, params);
  return r.rows as T[];
}

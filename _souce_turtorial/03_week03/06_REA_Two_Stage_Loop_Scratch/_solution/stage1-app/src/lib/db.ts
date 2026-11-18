import pg from 'pg';

const g = globalThis as unknown as { __pool?: pg.Pool };
export const pool = g.__pool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

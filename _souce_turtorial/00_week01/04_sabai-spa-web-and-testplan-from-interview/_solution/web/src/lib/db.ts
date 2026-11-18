import { Pool, types, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

// DATE เป็น string กันวันเลื่อนจาก timezone · NUMERIC เป็น string อยู่แล้ว
types.setTypeParser(1082, (v) => v);

export type Db = Pick<PoolClient, 'query'>;

let pool: Pool | undefined;

/** Pool สร้างตอนเรียกใช้ครั้งแรก จึงไม่ต่อฐานข้อมูลตอน build */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => console.error('[db] idle client error', err));
  }
  return pool;
}

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params as unknown[]);
}

/**
 * เปิด transaction แล้ว COMMIT เมื่อ fn สำเร็จ · throw แล้ว ROLLBACK
 * ลำดับล็อกใน transaction ต้องเป็น users → course_purchases → gift_cards เสมอ (DESIGN ข้อ 4)
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // การเชื่อมต่อขาดแล้ว ไม่มีอะไรให้ rollback
    }
    throw err;
  } finally {
    client.release();
  }
}

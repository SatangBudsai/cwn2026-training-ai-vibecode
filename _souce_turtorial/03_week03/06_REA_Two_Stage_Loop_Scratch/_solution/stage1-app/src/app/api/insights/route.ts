import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { rows } = await pool.query('SELECT data FROM insights WHERE id = 1');
  return Response.json(rows[0]?.data ?? null);
}

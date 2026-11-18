import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { HealthResponse } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await query('SELECT 1');
    return NextResponse.json<HealthResponse>({ ok: true, db: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json<HealthResponse>({ ok: false, db: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

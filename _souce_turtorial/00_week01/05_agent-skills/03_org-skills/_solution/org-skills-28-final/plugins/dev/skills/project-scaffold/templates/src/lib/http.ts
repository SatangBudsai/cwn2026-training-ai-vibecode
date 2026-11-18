import { randomUUID } from 'node:crypto';
import type { ZodType, ZodTypeDef } from 'zod';
import { AppError, ValidationError } from './app-error';
import { moduleLogger } from './logger';

// coding-rules ข้อ 10: สำเร็จ { data } · ผิดพลาด { error: { code, message } }
export function ok<T>(data: T, status = 200, headers?: HeadersInit): Response {
  return Response.json({ data }, { status, headers });
}

export function fail(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export function parseInput<T>(schema: ZodType<T, ZodTypeDef, unknown>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError();
  return result.data;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ValidationError('รูปแบบข้อมูลไม่ถูกต้อง');
  }
}

/** Next 15: อาร์กิวเมนต์ที่สองของ route handler ต้องมี params (Promise) เสมอ */
export type RouteContext = { params: Promise<Record<string, string>> };

type Handler<C> = (req: Request, ctx: C & { requestId: string }) => Promise<Response>;

/** ห่อ route handler: แปลง AppError เป็นรูปแบบเดียว, error อื่น log แล้วตอบ 500 ไม่ส่ง stack */
export function route<C extends RouteContext = RouteContext>(module: string, handler: Handler<C>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    const requestId = req.headers.get('x-request-id') ?? randomUUID();
    try {
      return await handler(req, { ...ctx, requestId });
    } catch (err: unknown) {
      if (err instanceof AppError) return fail(err.code, err.message, err.httpStatus);
      moduleLogger(module, requestId).error({ err }, 'unhandled error');
      return fail('INTERNAL_ERROR', 'ระบบขัดข้อง กรุณาลองใหม่', 500);
    }
  };
}

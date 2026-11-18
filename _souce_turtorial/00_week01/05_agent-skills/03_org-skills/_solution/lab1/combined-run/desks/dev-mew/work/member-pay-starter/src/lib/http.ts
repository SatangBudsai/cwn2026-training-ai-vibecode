import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { AppError, ForbiddenError, UnauthorizedError, ValidationFailedError } from "@/lib/app-error";
import { getContainer } from "@/lib/container";
import { getLogger } from "@/lib/logger";
import type { AccessTokenClaims, UserRole } from "@/modules/auth";

/** รูปแบบตอบเดียวทั้งระบบ (กติกาข้อ 10): { data } หรือ { error: { code, message } } */
export function respondOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function respondError(error: unknown, module: string, requestId: string): NextResponse {
  const log = getLogger(module, requestId);
  if (error instanceof AppError) {
    log.warn({ code: error.code }, "request failed");
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.httpStatus });
  }
  log.error({ err: error }, "unexpected error");
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง" } },
    { status: 500 },
  );
}

export function getRequestId(request: Request): string {
  return request.headers.get("x-request-id") ?? randomUUID();
}

export async function parseJsonBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw new ValidationFailedError(undefined, { cause: error });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationFailedError(undefined, { cause: parsed.error });
  return parsed.data;
}

/** ตรวจ Bearer token และ role ก่อนเรียก service */
export function requireUser(request: Request, roles?: readonly UserRole[]): AccessTokenClaims {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) throw new UnauthorizedError();
  const claims = getContainer().auth.verifyAccess(token);
  if (roles && !roles.includes(claims.role)) throw new ForbiddenError();
  return claims;
}

/** handler wrapper: requestId + error mapping แบบเดียวกันทุก route */
export async function handleRoute(
  request: Request,
  module: string,
  handler: (ctx: { requestId: string }) => Promise<NextResponse>,
): Promise<NextResponse> {
  const requestId = getRequestId(request);
  try {
    const response = await handler({ requestId });
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    return respondError(error, module, requestId);
  }
}

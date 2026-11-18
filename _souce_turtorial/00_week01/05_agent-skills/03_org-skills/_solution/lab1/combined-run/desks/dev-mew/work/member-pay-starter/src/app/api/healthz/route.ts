import { respondOk } from "@/lib/http";

export const dynamic = "force-dynamic";

export function GET() {
  return respondOk({ status: "ok" });
}

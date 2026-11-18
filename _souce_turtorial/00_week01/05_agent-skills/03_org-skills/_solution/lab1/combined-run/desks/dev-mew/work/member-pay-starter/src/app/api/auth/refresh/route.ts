import { readRefreshCookie, setRefreshCookie, toAccessPayload } from "@/lib/auth-cookie";
import { getContainer } from "@/lib/container";
import { handleRoute, respondOk } from "@/lib/http";

export const dynamic = "force-dynamic";

/** หมุน refresh token ทุกครั้งที่เรียก (cookie ใหม่ทุกครั้ง) */
export function POST(request: Request) {
  return handleRoute(request, "auth", async () => {
    const tokens = await getContainer().auth.refreshSession(readRefreshCookie(request));
    const response = respondOk(toAccessPayload(tokens));
    setRefreshCookie(response, tokens);
    return response;
  });
}

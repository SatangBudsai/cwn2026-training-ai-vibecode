import { setRefreshCookie, toAccessPayload } from "@/lib/auth-cookie";
import { getContainer } from "@/lib/container";
import { handleRoute, parseJsonBody, respondOk } from "@/lib/http";
import { LoginInputSchema } from "@/modules/auth";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleRoute(request, "auth", async () => {
    const body = await parseJsonBody(request, LoginInputSchema);
    const { user, tokens } = await getContainer().auth.loginUser(body);
    const response = respondOk({ user, ...toAccessPayload(tokens) });
    setRefreshCookie(response, tokens);
    return response;
  });
}

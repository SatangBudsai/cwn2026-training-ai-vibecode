import { clearRefreshCookie, readRefreshCookie } from "@/lib/auth-cookie";
import { getContainer } from "@/lib/container";
import { handleRoute, respondOk } from "@/lib/http";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleRoute(request, "auth", async () => {
    await getContainer().auth.logoutUser(readRefreshCookie(request));
    const response = respondOk({ loggedOut: true });
    clearRefreshCookie(response);
    return response;
  });
}

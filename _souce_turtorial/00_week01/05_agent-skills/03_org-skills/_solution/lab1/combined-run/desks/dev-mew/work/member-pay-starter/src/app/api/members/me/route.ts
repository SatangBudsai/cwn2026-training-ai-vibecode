import { getContainer } from "@/lib/container";
import { handleRoute, parseJsonBody, requireUser, respondOk } from "@/lib/http";
import { UpdateProfileInputSchema } from "@/modules/member";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleRoute(request, "member", async () => {
    const claims = requireUser(request);
    return respondOk({ profile: await getContainer().members.getProfile(claims.sub) });
  });
}

export function PATCH(request: Request) {
  return handleRoute(request, "member", async () => {
    const claims = requireUser(request);
    const body = await parseJsonBody(request, UpdateProfileInputSchema);
    return respondOk({ profile: await getContainer().members.updateProfile(claims.sub, body) });
  });
}

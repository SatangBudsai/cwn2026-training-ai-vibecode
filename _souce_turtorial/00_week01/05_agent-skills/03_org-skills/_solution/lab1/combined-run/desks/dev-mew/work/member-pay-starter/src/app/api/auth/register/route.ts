import { z } from "zod";
import { getContainer } from "@/lib/container";
import { handleRoute, parseJsonBody, respondOk } from "@/lib/http";
import { RegisterInputSchema } from "@/modules/auth";

export const dynamic = "force-dynamic";

const RegisterBodySchema = RegisterInputSchema.extend({
  displayName: z.string().trim().min(1).max(100),
});

export function POST(request: Request) {
  return handleRoute(request, "auth", async () => {
    const body = await parseJsonBody(request, RegisterBodySchema);
    const { auth, members } = getContainer();
    const user = await auth.registerUser({ email: body.email, password: body.password });
    await members.createProfile({ userId: user.id, displayName: body.displayName });
    return respondOk({ user }, 201);
  });
}

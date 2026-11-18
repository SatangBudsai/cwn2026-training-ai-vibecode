import { getContainer } from "@/lib/container";
import { handleRoute, parseJsonBody, requireUser, respondOk } from "@/lib/http";
import { CreateOrderInputSchema } from "@/modules/payment";

export const dynamic = "force-dynamic";

const CreateOrderBodySchema = CreateOrderInputSchema.omit({ userId: true });

export function POST(request: Request) {
  return handleRoute(request, "payment", async () => {
    const claims = requireUser(request, ["member", "admin"]);
    const body = await parseJsonBody(request, CreateOrderBodySchema);
    const order = await getContainer().payments.createOrder({ ...body, userId: claims.sub });
    return respondOk({ order }, 201);
  });
}

import { getContainer } from "@/lib/container";
import { handleRoute, requireUser, respondOk } from "@/lib/http";

export const dynamic = "force-dynamic";

export function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  return handleRoute(request, "payment", async () => {
    const claims = requireUser(request, ["admin"]);
    const { orderId } = await params;
    const order = await getContainer().payments.refundOrder(orderId, claims.sub);
    return respondOk({ order });
  });
}

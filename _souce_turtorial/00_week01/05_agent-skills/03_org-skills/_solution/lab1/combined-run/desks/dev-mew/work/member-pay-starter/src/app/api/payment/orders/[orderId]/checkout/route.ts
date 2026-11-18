import { getContainer } from "@/lib/container";
import { handleRoute, requireUser, respondOk } from "@/lib/http";

export const dynamic = "force-dynamic";

/** client ต้องเรียก /api/auth/refresh ก่อน endpoint นี้ทุกครั้ง (ดู redirectToPaymentGateway) */
export function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  return handleRoute(request, "payment", async () => {
    const claims = requireUser(request, ["member", "admin"]);
    const { orderId } = await params;
    const checkoutUrl = await getContainer().payments.buildCheckoutUrl(orderId, claims.sub);
    return respondOk({ checkoutUrl });
  });
}

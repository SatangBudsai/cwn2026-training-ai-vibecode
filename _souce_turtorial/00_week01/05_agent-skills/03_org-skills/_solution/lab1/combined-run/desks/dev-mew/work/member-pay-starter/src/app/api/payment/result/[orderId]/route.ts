import { getContainer } from "@/lib/container";
import { handleRoute, respondOk } from "@/lib/http";

export const dynamic = "force-dynamic";

/** ไม่ต้อง login: ผลการจ่ายเงินผูกกับ order_id ไม่ผูกกับ session */
export function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  return handleRoute(request, "payment", async () => {
    const { orderId } = await params;
    return respondOk(await getContainer().payments.getPaymentResult(orderId));
  });
}

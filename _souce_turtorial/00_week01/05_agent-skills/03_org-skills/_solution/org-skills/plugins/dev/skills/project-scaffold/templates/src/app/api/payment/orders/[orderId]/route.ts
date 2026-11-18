import { ok, parseInput, route } from '@/lib/http';
import { getPaymentService, orderIdSchema } from '@/modules/payment';

type Ctx = { params: Promise<{ orderId: string }> };

// หน้า callback เรียกโดยไม่ต้องมี session (บทเรียนบั๊ก ShopDee: ห้ามผูกผลจ่ายเงินกับ session)
// ตอบแค่สถานะ ไม่มีข้อมูลส่วนบุคคล · order id เป็น UUID สุ่ม เดาไม่ได้
export const GET = route<Ctx>('payment', async (_req, { params }) => {
  const orderId = parseInput(orderIdSchema, (await params).orderId);
  return ok(await getPaymentService().getOrderStatus(orderId));
});

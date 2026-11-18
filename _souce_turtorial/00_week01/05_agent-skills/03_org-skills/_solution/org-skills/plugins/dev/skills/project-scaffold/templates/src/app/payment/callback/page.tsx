import { PaymentResult } from './payment-result';

export const dynamic = 'force-dynamic';

// gateway พากลับมาที่นี่พร้อม ?order_id= — อ่านผลจาก order ไม่ใช่ session (บทเรียนบั๊ก ShopDee 2025)
export default async function PaymentCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { order_id: orderId } = await searchParams;
  return (
    <main>
      <h1>ผลการชำระเงิน</h1>
      {orderId ? <PaymentResult orderId={orderId} /> : <p role="alert">ไม่พบเลขคำสั่งซื้อ</p>}
    </main>
  );
}

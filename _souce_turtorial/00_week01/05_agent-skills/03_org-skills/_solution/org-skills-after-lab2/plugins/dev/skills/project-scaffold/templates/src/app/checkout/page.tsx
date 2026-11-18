import { PACKAGES } from '@/modules/payment';
import { CheckoutForm } from './checkout-form';

export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  // ส่งเฉพาะข้อมูลแสดงผลให้ client — ราคาจริงคำนวณที่ server ตอน checkout
  const packages = PACKAGES.map(({ id, description, amountSatang }) => ({ id, description, amountSatang }));
  return (
    <main>
      <h1>ซื้อแพ็กเกจ</h1>
      <CheckoutForm packages={packages} />
    </main>
  );
}

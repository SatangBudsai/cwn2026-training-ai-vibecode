import { getContainer } from "@/lib/container";
import { AppError } from "@/lib/app-error";

export const dynamic = "force-dynamic";

/** หน้า callback จาก gateway: อ่านผลจาก order_id ไม่ต้องมี session (ตะกร้าไม่หาย ไม่เด้งไปหน้า login) */
export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { order_id: orderId = "" } = await searchParams;
  let message = "ไม่พบคำสั่งซื้อ";
  try {
    message = (await getContainer().payments.getPaymentResult(orderId)).message;
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
  }
  return (
    <main>
      <h1>{message}</h1>
      <p>เลขคำสั่งซื้อ: {orderId || "-"}</p>
    </main>
  );
}

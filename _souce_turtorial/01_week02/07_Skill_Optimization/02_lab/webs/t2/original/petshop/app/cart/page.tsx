import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = { title: "ตะกร้าสินค้า" };

export default function CartPage() {
  return <CartView />;
}

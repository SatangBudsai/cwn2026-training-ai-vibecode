import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/CheckoutForm";
import { currentPublicUser } from "@/lib/auth";

export const metadata: Metadata = { title: "ชำระเงิน" };

export default async function CheckoutPage() {
  const user = await currentPublicUser();
  if (!user) redirect("/login?next=/checkout");
  return <CheckoutForm userName={user.name} />;
}

import type { Metadata } from "next";
import { WishlistView } from "@/components/WishlistView";

export const metadata: Metadata = { title: "รายการโปรด" };

export default function WishlistPage() {
  return <WishlistView />;
}

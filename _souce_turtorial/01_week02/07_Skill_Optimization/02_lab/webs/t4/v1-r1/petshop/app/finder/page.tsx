import type { Metadata } from "next";
import { FinderWizard } from "@/components/FinderWizard";

export const metadata: Metadata = { title: "ตัวช่วยเลือกอาหาร" };

export default function FinderPage() {
  return <FinderWizard />;
}

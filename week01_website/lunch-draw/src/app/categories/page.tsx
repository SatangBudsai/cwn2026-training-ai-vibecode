import { Suspense } from "react";
import { connection } from "next/server";
import { CategoryManager } from "@/components/category-manager";
import { listCategories, realtimeMode } from "@/lib/server";

export const metadata = { title: "ประเภทอาหาร · ข้าวไหนดี" };

async function Manager() {
  await connection();
  return <CategoryManager initial={await listCategories()} realtime={realtimeMode()} />;
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<div className="mt-4 h-96 rounded-2xl border border-line bg-card" />}>
      <Manager />
    </Suspense>
  );
}

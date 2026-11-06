import { Suspense } from "react";
import { connection } from "next/server";
import { CategoryManager } from "@/components/category-manager";
import { listCategories } from "@/lib/server";

export const metadata = { title: "แนวอาหาร · ข้าวไหนดี" };

async function Manager() {
  await connection();
  return <CategoryManager initial={listCategories()} />;
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<div className="mt-4 h-96 rounded-2xl border border-line bg-card" />}>
      <Manager />
    </Suspense>
  );
}

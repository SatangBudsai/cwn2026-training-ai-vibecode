import { Suspense } from "react";
import { connection } from "next/server";
import { AddRestaurantForm } from "@/components/add-restaurant-form";
import { listCategories } from "@/lib/server";

export const metadata = { title: "เพิ่มร้าน · ข้าวไหนดี" };

async function Form() {
  await connection(); // the category list can be edited
  return <AddRestaurantForm categories={await listCategories()} />;
}

export default function NewRestaurantPage() {
  return (
    <Suspense fallback={<div className="mt-4 h-96 rounded-2xl border border-line bg-card" />}>
      <Form />
    </Suspense>
  );
}

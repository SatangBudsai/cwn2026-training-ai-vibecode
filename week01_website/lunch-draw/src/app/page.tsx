import { Suspense } from "react";
import { connection } from "next/server";
import { LunchApp } from "@/components/lunch-app";
import { BoardSkeleton } from "@/components/board-skeleton";
import { listCategories, listRestaurants } from "@/lib/server";

async function Board() {
  await connection(); // weights and recent visits change per request
  const [restaurants, categories] = await Promise.all([listRestaurants(), listCategories()]);
  return <LunchApp restaurants={restaurants} categories={categories} />;
}

export default function Home() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <Board />
    </Suspense>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LunchApp } from "@/components/lunch-app";
import { BoardSkeleton } from "@/components/board-skeleton";
import { listCategories, listRestaurants, realtimeMode, roomState } from "@/lib/server";

export async function generateMetadata({ params }: PageProps<"/room/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `ห้อง ${code.toUpperCase()} · ข้าวไหนดี` };
}

async function Room({ params }: { params: PageProps<"/room/[code]">["params"] }) {
  await connection();
  const { code } = await params;
  const [room, restaurants, categories] = await Promise.all([
    roomState(code),
    listRestaurants(),
    listCategories(),
  ]);
  if (!room) notFound();
  return <LunchApp restaurants={restaurants} categories={categories} room={room} realtime={realtimeMode()} />;
}

export default function RoomPage({ params }: PageProps<"/room/[code]">) {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <Room params={params} />
    </Suspense>
  );
}

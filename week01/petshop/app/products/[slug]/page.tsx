import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/ProductDetail";
import { getProduct } from "@/lib/products";
import { liveProducts } from "@/lib/store";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  return { title: p ? p.name : "ไม่พบสินค้า" };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const all = liveProducts();
  const product = all.find((p) => p.slug === slug);
  if (!product) notFound();

  const boughtWith = product.boughtWith
    .map((s) => all.find((p) => p.slug === s))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const similar = all
    .filter((p) => p.slug !== product.slug && p.pet === product.pet && p.type === product.type)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 4);

  return <ProductDetail product={product} boughtWith={boughtWith} similar={similar} />;
}

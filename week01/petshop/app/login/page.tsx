import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

function safeNext(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <AuthShell title="ยินดีต้อนรับกลับมา 👋" subtitle="เข้าสู่ระบบเพื่อสั่งซื้อและดูประวัติคำสั่งซื้อ" emoji="🐱" image="/images/brand/login.jpg">
      <LoginForm next={safeNext(sp.next)} />
    </AuthShell>
  );
}

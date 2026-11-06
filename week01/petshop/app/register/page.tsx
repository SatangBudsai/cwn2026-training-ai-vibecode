import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { RegisterForm } from "@/components/RegisterForm";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default function RegisterPage() {
  return (
    <AuthShell title="สมัครสมาชิก PawPantry ✨" subtitle="สร้างบัญชีฟรี รับสิทธิพิเศษสำหรับทาสหมาทาสแมว" emoji="🐶" image="/images/brand/register.jpg">
      <RegisterForm />
    </AuthShell>
  );
}

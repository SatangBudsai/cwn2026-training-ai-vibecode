"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MSG } from "@/lib/validation";
import { useShop } from "./ShopProvider";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { setUser, showToast } = useShop();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? MSG.login);
        setLoading(false);
        return;
      }
      setUser(data.user);
      showToast("เข้าสู่ระบบสำเร็จ 🐾");
      router.push(next);
      router.refresh();
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่");
      setLoading(false);
    }
  };

  const registerHref = next !== "/" ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="login-email">อีเมล</label>
        <input
          id="login-email"
          type="email"
          data-testid="login-email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="login-password">รหัสผ่าน</label>
        <div className="pw-wrap">
          <input
            id="login-password"
            type={showPw ? "text" : "password"}
            data-testid="login-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className="pw-eye" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
            {showPw ? "🙈" : "👁️"}
          </button>
        </div>
      </div>
      {error ? (
        <p className="form-error" data-testid="login-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary btn-lg btn-block" data-testid="login-submit" disabled={loading}>
        {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
      <p className="auth-alt">
        ยังไม่มีบัญชี?{" "}
        <Link href={registerHref} data-testid="register-link">
          สมัครสมาชิก
        </Link>
      </p>
      <p className="demo-hint">
        บัญชีทดลอง: <code>demo@pawpantry.test</code> / <code>Paw12345</code>
      </p>
    </form>
  );
}

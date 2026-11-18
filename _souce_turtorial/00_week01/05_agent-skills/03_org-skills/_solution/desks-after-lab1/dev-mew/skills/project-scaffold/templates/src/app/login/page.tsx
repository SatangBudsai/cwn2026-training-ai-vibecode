'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { setSession } from '@/lib/client/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });
    const body = (await res.json()) as {
      data?: { accessToken: string; accessExpiresAt: string };
      error?: { message: string };
    };
    if (!body.data) {
      setError(body.error?.message ?? 'เข้าสู่ระบบไม่สำเร็จ');
      return;
    }
    setSession(body.data.accessToken, body.data.accessExpiresAt);
    router.push('/checkout');
  }

  return (
    <main>
      <h1>เข้าสู่ระบบ</h1>
      <form onSubmit={onSubmit}>
        <label>
          อีเมล <input name="email" type="email" required />
        </label>
        <br />
        <label>
          รหัสผ่าน <input name="password" type="password" required />
        </label>
        <br />
        <button type="submit">เข้าสู่ระบบ</button>
      </form>
      {error && (
        <p role="alert" data-testid="form-error">
          {error}
        </p>
      )}
    </main>
  );
}

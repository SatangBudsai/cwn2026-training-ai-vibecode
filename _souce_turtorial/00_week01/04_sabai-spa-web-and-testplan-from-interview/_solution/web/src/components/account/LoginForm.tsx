'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, ErrorMessage } from '@/components/ui';
import { f5 } from '@/i18n/f5';
import { api } from '@/lib/api-client';
import type { AuthResponse, LoginRequest, Locale } from '@/types';
import { toUiError, type UiError } from './helpers';
import styles from './auth.module.css';

export function LoginForm({ locale, next }: { locale: Locale; next: string | null }) {
  const m = f5[locale];
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body: LoginRequest = { email: String(data.get('email')), password: String(data.get('password')) };
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<AuthResponse>('/api/auth/login', { locale, body });
      const target = user.role === 'OWNER' ? `/${locale}/admin` : (next ?? `/${locale}/account`);
      // ต้อง push ก่อน refresh: navigation ที่ตามมาจะทิ้ง refresh ที่ค้างอยู่ แล้ว header ไม่อัปเดต
      router.push(target);
      router.refresh();
    } catch (err) {
      setError(toUiError(err, m.networkError));
      setBusy(false);
    }
  }

  const registerHref = `/${locale}/register${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate data-testid="login-form">
      <div className={`field ${styles.fieldBox}`}>
        <label htmlFor="login-email">{m.loginEmail}</label>
        <input id="login-email" name="email" type="email" autoComplete="email" className="input" data-testid="login-email" />
      </div>
      <div className={`field ${styles.fieldBox}`}>
        <label htmlFor="login-password">{m.loginPassword}</label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" className="input" data-testid="login-password" />
      </div>
      {error && <ErrorMessage code={error.code} message={error.message} />}
      <Button testId="login-submit" type="submit" size="lg" className={styles.submit} disabled={busy}>
        {busy ? m.loginBusy : m.loginSubmit}
      </Button>
      <p className={styles.switch}>
        {m.loginNoAccount}
        <Link href={registerHref} className={styles.switchLink} data-testid="login-to-register">
          {m.loginToRegister}
        </Link>
      </p>
    </form>
  );
}

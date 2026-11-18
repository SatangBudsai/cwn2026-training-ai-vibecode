'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, ErrorMessage } from '@/components/ui';
import { f5 } from '@/i18n/f5';
import { api } from '@/lib/api-client';
import type { AuthResponse, Locale, RegisterRequest } from '@/types';
import { toUiError, type UiError } from './helpers';
import styles from './auth.module.css';

/** ฟอร์มนี้ไม่มีช่องรูปหน้าหรือช่องอัปโหลดใด ๆ (FR-73, NFR-08) · ตรวจข้อมูลที่ API เพื่อให้ error เป็นข้อความเดียวกันทุกภาษา */
export function RegisterForm({ locale, next }: { locale: Locale; next: string | null }) {
  const m = f5[locale];
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body: RegisterRequest = {
      email: String(data.get('email')),
      password: String(data.get('password')),
      fullName: String(data.get('fullName')),
      phone: String(data.get('phone')),
      birthDate: String(data.get('birthDate')),
    };
    setBusy(true);
    setError(null);
    try {
      await api<AuthResponse>('/api/auth/register', { locale, body });
      // ต้อง push ก่อน refresh: navigation ที่ตามมาจะทิ้ง refresh ที่ค้างอยู่ แล้ว header ไม่อัปเดต
      router.push(next ?? `/${locale}/account`);
      router.refresh();
    } catch (err) {
      setError(toUiError(err, m.networkError));
      setBusy(false);
    }
  }

  const loginHref = `/${locale}/login${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate data-testid="register-form">
      <div className={`field ${styles.fieldBox}`}>
        <label htmlFor="register-email">{m.registerEmail}</label>
        <input id="register-email" name="email" type="email" autoComplete="email" className="input" data-testid="register-email" />
      </div>
      <div className={`field ${styles.fieldBox}`}>
        <label htmlFor="register-password">{m.registerPassword}</label>
        <input id="register-password" name="password" type="password" autoComplete="new-password" aria-describedby="register-password-hint" className="input" data-testid="register-password" />
        <p id="register-password-hint" className={styles.hint}>{m.registerPasswordHint}</p>
      </div>
      <div className={`field ${styles.fieldBox}`}>
        <label htmlFor="register-name">{m.registerName}</label>
        <input id="register-name" name="fullName" type="text" autoComplete="name" className="input" data-testid="register-name" />
      </div>
      <div className={styles.row}>
        <div className={`field ${styles.fieldBox}`}>
          <label htmlFor="register-phone">{m.registerPhone}</label>
          <input id="register-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel" aria-describedby="register-phone-hint" className="input" data-testid="register-phone" />
          <p id="register-phone-hint" className={styles.hint}>{m.registerPhoneHint}</p>
        </div>
        <div className={`field ${styles.fieldBox}`}>
          <label htmlFor="register-birth-date">{m.registerBirthDate}</label>
          <input id="register-birth-date" name="birthDate" type="date" autoComplete="bday" aria-describedby="register-birth-note" className={`input ${styles.dateInput}`} data-testid="register-birth-date" />
        </div>
      </div>
      <p id="register-birth-note" className={styles.note} data-testid="register-birth-note">{m.registerBirthNote}</p>
      {error && <ErrorMessage code={error.code} message={error.message} />}
      <Button testId="register-submit" type="submit" size="lg" className={styles.submit} disabled={busy}>
        {busy ? m.registerBusy : m.registerSubmit}
      </Button>
      <p className={styles.switch}>
        {m.registerHasAccount}
        <Link href={loginHref} className={styles.switchLink} data-testid="register-to-login">
          {m.registerToLogin}
        </Link>
      </p>
    </form>
  );
}

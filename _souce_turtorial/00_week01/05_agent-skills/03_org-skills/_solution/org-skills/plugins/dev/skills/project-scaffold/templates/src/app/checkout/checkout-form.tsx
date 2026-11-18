'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authFetch, goToGateway, hasSession, refreshNow } from '@/lib/client/auth-client';

interface PackageView {
  id: string;
  description: string;
  amountSatang: number;
}

const formatBaht = (satang: number) => (satang / 100).toLocaleString('th-TH', { style: 'currency', currency: 'THB' });

export function CheckoutForm({ packages }: { packages: PackageView[] }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // เปิดหน้าใหม่ (เช่น กลับจาก gateway) → กู้ session จาก refresh cookie ก่อน ไม่เด้งไป login ทันที
    void (async () => {
      if (hasSession() || (await refreshNow())) setReady(true);
      else router.replace('/login');
    })();
  }, [router]);

  async function pay(packageId: string) {
    setError(null);
    const res = await authFetch('/api/payment/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId }),
    });
    const body = (await res.json()) as { data?: { redirectUrl: string }; error?: { message: string } };
    if (!body.data) {
      setError(body.error?.message ?? 'สร้างคำสั่งซื้อไม่สำเร็จ');
      return;
    }
    try {
      await goToGateway(body.data.redirectUrl);
    } catch {
      router.replace('/login');
    }
  }

  if (!ready) return <p>กำลังโหลด…</p>;
  return (
    <>
      <ul>
        {packages.map((p) => (
          <li key={p.id}>
            {p.description} — {formatBaht(p.amountSatang)}{' '}
            <button type="button" data-testid={`pay-${p.id}`} onClick={() => void pay(p.id)}>
              ชำระเงิน
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" data-testid="form-error">
          {error}
        </p>
      )}
    </>
  );
}

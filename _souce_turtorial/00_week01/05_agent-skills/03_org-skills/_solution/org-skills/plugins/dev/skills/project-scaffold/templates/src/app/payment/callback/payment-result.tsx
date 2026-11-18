'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { refreshNow } from '@/lib/client/auth-client';

type Status = 'pending' | 'paid' | 'refunded' | 'error';

const POLL_MS = 2_000;
const MAX_POLLS = 30;

export function PaymentResult({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<Status>('pending');

  useEffect(() => {
    let polls = 0;
    let stopped = false;
    // กู้ session เงียบ ๆ (ถ้ากู้ไม่ได้ก็ยังเห็นผลจ่ายเงินได้ ไม่เด้งไป login)
    void refreshNow();

    async function poll() {
      const res = await fetch(`/api/payment/orders/${encodeURIComponent(orderId)}`);
      const body = (await res.json()) as { data?: { status: Status } };
      if (stopped) return;
      const next = body.data?.status ?? 'error';
      setStatus(next);
      // webhook อาจมาช้ากว่าผู้ใช้ → รอจน paid หรือครบรอบ
      if (next === 'pending' && ++polls < MAX_POLLS) setTimeout(() => void poll(), POLL_MS);
    }
    void poll();
    return () => {
      stopped = true;
    };
  }, [orderId]);

  if (status === 'paid') {
    return (
      <>
        <p data-testid="payment-status">ชำระเงินสำเร็จ</p>
        <Link href="/checkout">กลับไปหน้าแพ็กเกจ</Link>
      </>
    );
  }
  if (status === 'refunded') return <p data-testid="payment-status">คืนเงินแล้ว</p>;
  if (status === 'error') return <p role="alert">ไม่พบคำสั่งซื้อ</p>;
  return <p data-testid="payment-status">กำลังตรวจสอบการชำระเงิน…</p>;
}

'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { common } from '@/i18n/common';
import { api } from '@/lib/api-client';
import type { ClockResponse, Locale, TestOkResponse } from '@/types';
import styles from './layout.module.css';

/** แผงทดสอบเล็ก ๆ ท้ายหน้า · render เฉพาะเมื่อ ALLOW_TEST_RESET=1 (NFR-15, NFR-18) */
export function TestPanel({ locale }: { locale: Locale }) {
  const m = common[locale];
  const [now, setNow] = useState('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<ClockResponse>('/api/clock', { locale })
      .then((c) => {
        setNow(c.now);
        setValue(c.now.slice(0, 16));
      })
      .catch(() => setNow(''));
  }, [locale]);

  const run = async (path: string, body: unknown) => {
    setBusy(true);
    try {
      await api<TestOkResponse>(path, { locale, method: 'POST', body });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className={styles.testPanel} data-testid="test-panel" aria-label={m.testPanelTitle}>
      <div className={`container ${styles.testRow}`}>
        <span>
          {m.testNow}: <code data-testid="test-now">{now}</code>
        </span>
        <label className={styles.testLabel}>
          {m.testLockInput}
          <input type="datetime-local" data-testid="lock-today" value={value} onChange={(e) => setValue(e.target.value)} className={styles.testInput} />
        </label>
        <Button testId="lock-today-submit" size="sm" variant="ghost" disabled={busy || !value} onClick={() => run('/api/test/lock', { now: `${value.slice(0, 16)}:00+07:00` })}>
          {m.testLock}
        </Button>
        <Button testId="reset-test-data" size="sm" variant="ghost" disabled={busy} onClick={() => run('/api/test/reset', value ? { now: `${value.slice(0, 16)}:00+07:00` } : {})}>
          {m.testReset}
        </Button>
      </div>
    </aside>
  );
}

'use client';
import { useEffect } from 'react';

/** SSR เริ่ม data-ready="false" แล้วตั้ง "true" หลัง hydrate */
export function ReadyFlag() {
  useEffect(() => {
    document.documentElement.setAttribute('data-ready', 'true');
  }, []);
  return null;
}

'use client';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import SearchForm from './SearchForm';
import { readQuery } from '@/lib/search';

// หน้าแรก: ค่าเริ่มต้น ไป-กลับ · ต้นทางกรุงเทพมหานคร (A1 · เส้นทางมาตรฐานขั้น 1)
export default function HomeForm() {
  const params = useSearchParams();
  const initial = useMemo(() => {
    const q = readQuery(new URLSearchParams(params.toString()));
    return params.has('trip') ? q : { ...q, trip: 'roundtrip' as const };
  }, [params]);
  return <SearchForm initial={initial} mode="home" />;
}

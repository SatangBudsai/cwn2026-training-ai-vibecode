'use client';
import { LinkButton } from '@/components/ui';
import { common } from '@/i18n/common';
import { useLocale } from '@/i18n/use-locale';

export default function NotFound() {
  const locale = useLocale();
  const m = common[locale];
  return (
    <div className="container" style={{ paddingBlock: '96px', textAlign: 'center', display: 'grid', gap: 16, justifyItems: 'center' }}>
      <h1>{m.notFoundTitle}</h1>
      <p>{m.notFoundBody}</p>
      <LinkButton testId="not-found-home" href={`/${locale}`}>
        {m.notFoundHome}
      </LinkButton>
    </div>
  );
}

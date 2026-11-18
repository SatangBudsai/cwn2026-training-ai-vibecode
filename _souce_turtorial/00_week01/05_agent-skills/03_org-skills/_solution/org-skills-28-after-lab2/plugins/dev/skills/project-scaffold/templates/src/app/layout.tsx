import type { ReactNode } from 'react';

export const metadata = { title: '__PROJECT_TITLE__' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '40px auto', padding: '0 16px' }}>{children}</body>
    </html>
  );
}

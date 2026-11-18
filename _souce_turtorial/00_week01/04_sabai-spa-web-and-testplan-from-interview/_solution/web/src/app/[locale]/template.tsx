import type { ReactNode } from 'react';

/** เปลี่ยนหน้าแบบนุ่มทุกหน้า · template สร้างใหม่ทุกครั้งที่เปลี่ยนเส้นทาง */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-transition">{children}</div>;
}

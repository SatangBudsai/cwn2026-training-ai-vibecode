import Link from "next/link";
import { Plus } from "lucide-react";
import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:px-8">
      <Link href="/" className="flex items-center gap-2">
        <Logo size={30} />
        <span className="text-[15px] font-medium">ข้าวไหนดี</span>
        <span className="hidden text-sm text-fg-3 sm:inline">สีลม · จันวาณิชย์</span>
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        <Link href="/" className="rounded-lg px-3 py-2 text-fg-2 transition-colors hover:bg-raised hover:text-fg">
          สุ่มร้าน
        </Link>
        <Link href="/history" className="rounded-lg px-3 py-2 text-fg-2 transition-colors hover:bg-raised hover:text-fg">
          ประวัติ
        </Link>
        <Link
          href="/restaurants/new"
          className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-raised px-3 text-fg transition-colors hover:bg-[#2a2a2d]"
        >
          <Plus size={16} strokeWidth={1.5} />
          เพิ่มร้าน
        </Link>
      </nav>
    </header>
  );
}

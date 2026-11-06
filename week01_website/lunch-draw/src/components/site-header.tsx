import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:px-8">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-md border border-line-strong bg-raised font-mono text-xs text-ember-ink">
          01
        </span>
        <span className="text-[15px] font-medium">ข้าวไหนดี</span>
        <span className="hidden text-sm text-fg-3 sm:inline">สีลม · จันวาณิชย์</span>
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        <Link href="/" className="rounded-lg px-3 py-2 text-fg-2 transition-colors hover:bg-raised hover:text-fg">
          จับสลาก
        </Link>
        <Link href="/history" className="rounded-lg px-3 py-2 text-fg-2 transition-colors hover:bg-raised hover:text-fg">
          ประวัติ
        </Link>
      </nav>
    </header>
  );
}

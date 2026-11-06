"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { SmartImage } from "./SmartImage";
import { useShop } from "./ShopProvider";

function CountBadge({ count, testId }: { count: number; testId: string }) {
  // key={count} re-mounts the badge so the "pop" animation replays on every change.
  return (
    <span key={count} className={`count-badge ${count === 0 ? "is-zero" : "pop"}`} data-testid={testId}>
      {count}
    </span>
  );
}

export function Header() {
  const { cartCount, wishlistCount, user, setUser, showToast } = useShop();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const [query, setQuery] = useState("");

  // Close the drawer whenever the route changes.
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors – we still clear local state
    }
    setUser(null);
    showToast("ออกจากระบบแล้ว แล้วพบกันใหม่ 👋", "info");
    router.push("/");
    router.refresh();
  };

  const isActive = (href: string) => (pathname === href ? "active" : "");

  const navLinks = (
    <>
      <Link href="/products?pet=cat" data-testid="nav-cat" className="nav-link nav-cat">
        <span aria-hidden="true">🐱</span> อาหารแมว
      </Link>
      <Link href="/products?pet=dog" data-testid="nav-dog" className="nav-link nav-dog">
        <span aria-hidden="true">🐶</span> อาหารสุนัข
      </Link>
      <Link href="/products?type=toy" data-testid="nav-toys" className="nav-link nav-toys">
        <span aria-hidden="true">🧸</span> ของเล่น
      </Link>
      <Link href="/finder" data-testid="nav-finder" className={`nav-link nav-finder ${isActive("/finder")}`}>
        <span aria-hidden="true">✨</span> ช่วยเลือกอาหาร
      </Link>
    </>
  );

  return (
    <>
      <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
        <div className="header-bar container">
          <button
            type="button"
            className="menu-toggle"
            data-testid="menu-toggle"
            aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนู"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className={`burger ${menuOpen ? "open" : ""}`} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </button>

          <Link href="/" className="logo" data-testid="logo" aria-label="PawPantry หน้าแรก">
            <SmartImage src="/images/brand/logo.png" alt="โลโก้ PawPantry" emoji="🐾" className="logo-mark" eager />
            <span className="logo-word">
              Paw<span>Pantry</span>
            </span>
          </Link>

          <nav className="desktop-nav" aria-label="เมนูหลัก">
            {navLinks}
          </nav>

          <form className="search" role="search" onSubmit={onSearch}>
            <label htmlFor="site-search" className="sr-only">
              ค้นหาสินค้า
            </label>
            <span className="search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              id="site-search"
              type="search"
              data-testid="search-input"
              placeholder="ค้นหาสินค้า…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="search-btn" data-testid="search-submit">
              ค้นหา
            </button>
          </form>

          <div className="header-actions">
            <Link href="/wishlist" className="icon-link" data-testid="wishlist-link" aria-label="รายการโปรด">
              <span className="icon" aria-hidden="true">
                ♥
              </span>
              <CountBadge count={wishlistCount} testId="wishlist-count" />
            </Link>
            <Link href="/cart" className="icon-link cart-icon" data-testid="cart-link" aria-label="ตะกร้าสินค้า">
              <span className="icon" aria-hidden="true">
                🛒
              </span>
              <CountBadge count={cartCount} testId="cart-count" />
            </Link>
            {user ? (
              <div className="user-box">
                <Link href="/account" className="user-menu" data-testid="user-menu" title="บัญชีของฉัน">
                  <span className="avatar" aria-hidden="true">
                    {user.name.trim().charAt(0) || "🐾"}
                  </span>
                  <span className="user-name">{user.name}</span>
                </Link>
                <button type="button" className="logout-btn" data-testid="logout-button" onClick={logout}>
                  <span aria-hidden="true" className="logout-icon">
                    ⎋
                  </span>
                  <span className="logout-text">ออกจากระบบ</span>
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn btn-ghost btn-sm login-link" data-testid="login-link">
                เข้าสู่ระบบ
              </Link>
            )}
          </div>
        </div>
      </header>

      {menuOpen ? (
        <>
          <div className="drawer-backdrop" aria-hidden="true" onClick={() => setMenuOpen(false)} />
          <nav id="mobile-menu" className="mobile-menu" data-testid="mobile-menu" aria-label="เมนูมือถือ">
            <p className="drawer-title">เมนู 🐾</p>
            {navLinks}
            <hr />
            <Link href="/wishlist" className="nav-link">
              <span aria-hidden="true">♥</span> รายการโปรด
            </Link>
            <Link href="/cart" className="nav-link">
              <span aria-hidden="true">🛒</span> ตะกร้าสินค้า
            </Link>
            <Link href={user ? "/account" : "/login"} className="nav-link">
              <span aria-hidden="true">👤</span> {user ? "บัญชีของฉัน" : "เข้าสู่ระบบ / สมัครสมาชิก"}
            </Link>
          </nav>
        </>
      ) : null}
    </>
  );
}

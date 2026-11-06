"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getProduct } from "@/lib/products";

export interface CartItem {
  slug: string;
  size: string;
  qty: number;
}

export interface ClientUser {
  id: number;
  name: string;
  email: string;
  pet: "cat" | "dog" | "both";
}

export interface ToastMsg {
  id: number;
  text: string;
  kind: "success" | "info" | "error";
}

interface ShopCtx {
  ready: boolean;
  bugMode: boolean;
  user: ClientUser | null;
  setUser: (u: ClientUser | null) => void;

  cart: CartItem[];
  cartCount: number;
  addToCart: (slug: string, size: string, qty: number) => number;
  setCartQty: (slug: string, size: string, qty: number) => number;
  removeFromCart: (slug: string, size: string) => void;
  clearCart: () => void;

  wishlist: string[];
  wishlistCount: number;
  isWishlisted: (slug: string) => boolean;
  toggleWishlist: (slug: string) => boolean;
  removeFromWishlist: (slug: string) => void;

  recent: string[];
  addRecent: (slug: string) => void;

  coupon: string | null;
  setCoupon: (code: string | null) => void;

  stockOf: (slug: string) => number;
  stockMap: Record<string, number>;
  refreshStock: () => Promise<void>;

  toast: ToastMsg | null;
  showToast: (text: string, kind?: ToastMsg["kind"]) => void;
}

const Ctx = createContext<ShopCtx | null>(null);

export const LS_CART = "pp-cart";
export const LS_WISHLIST = "pp-wishlist";
export const LS_RECENT = "pp-recent";
export const LS_COUPON = "pp-coupon";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable – ignore
  }
}

function sanitizeCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CartItem[] = [];
  for (const it of raw) {
    if (!it || typeof it !== "object") continue;
    const { slug, size, qty } = it as Record<string, unknown>;
    const p = typeof slug === "string" ? getProduct(slug) : undefined;
    if (!p || typeof size !== "string" || !p.sizes.some((s) => s.label === size)) continue;
    const n = Math.floor(Number(qty));
    if (!Number.isFinite(n) || n < 1) continue;
    out.push({ slug: p.slug, size, qty: n });
  }
  return out;
}

function sanitizeSlugs(raw: unknown, limit = 100): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const s of raw) if (typeof s === "string" && getProduct(s)) seen.add(s);
  return [...seen].slice(0, limit);
}

export function ShopProvider({
  children,
  initialUser,
  initialStock,
  bugMode,
}: {
  children: ReactNode;
  initialUser: ClientUser | null;
  initialStock: Record<string, number>;
  bugMode: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<ClientUser | null>(initialUser);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [wishlistBadge, setWishlistBadge] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [coupon, setCouponState] = useState<string | null>(null);
  const [stockMap, setStockMap] = useState<Record<string, number>>(initialStock);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  // Refs mirror state so actions can compute results synchronously.
  const cartRef = useRef<CartItem[]>([]);
  const wishlistRef = useRef<string[]>([]);
  const recentRef = useRef<string[]>([]);
  const stockRef = useRef(initialStock);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastId = useRef(0);

  useEffect(() => {
    const c = sanitizeCart(readJson(LS_CART, []));
    const w = sanitizeSlugs(readJson(LS_WISHLIST, []));
    const r = sanitizeSlugs(readJson(LS_RECENT, []), 6);
    let cp: string | null = null;
    try {
      cp = window.localStorage.getItem(LS_COUPON);
    } catch {
      cp = null;
    }
    cartRef.current = c;
    wishlistRef.current = w;
    recentRef.current = r;
    /* eslint-disable react-hooks/set-state-in-effect -- hydrating client state from localStorage */
    setCart(c);
    setWishlist(w);
    setWishlistBadge(w.length);
    setRecent(r);
    setCouponState(cp && cp.trim() ? cp : null);
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (ready) document.documentElement.dataset.ready = "true";
  }, [ready]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const stockOf = useCallback((slug: string) => stockRef.current[slug] ?? getProduct(slug)?.stock ?? 0, []);

  const commitCart = useCallback((next: CartItem[]) => {
    cartRef.current = next;
    setCart(next);
    writeJson(LS_CART, next);
  }, []);

  const commitWishlist = useCallback((next: string[]) => {
    wishlistRef.current = next;
    setWishlist(next);
    writeJson(LS_WISHLIST, next);
  }, []);

  const addToCart = useCallback(
    (slug: string, size: string, qty: number) => {
      const current = cartRef.current;
      const stock = stockOf(slug);
      const others = current.filter((i) => i.slug === slug && i.size !== size).reduce((s, i) => s + i.qty, 0);
      const allowed = Math.max(0, stock - others);
      const existing = current.find((i) => i.slug === slug && i.size === size);
      const before = existing?.qty ?? 0;
      const after = Math.min(before + Math.max(1, Math.floor(qty)), allowed);
      const added = after - before;
      if (added <= 0) return 0;
      const next = existing
        ? current.map((i) => (i === existing ? { ...i, qty: after } : i))
        : [...current, { slug, size, qty: after }];
      commitCart(next);
      return added;
    },
    [commitCart, stockOf],
  );

  const setCartQty = useCallback(
    (slug: string, size: string, qty: number) => {
      const current = cartRef.current;
      const others = current.filter((i) => i.slug === slug && i.size !== size).reduce((s, i) => s + i.qty, 0);
      const allowed = Math.max(1, stockOf(slug) - others);
      const n = Number.isFinite(qty) ? Math.floor(qty) : 1;
      const clamped = Math.min(Math.max(1, n), allowed);
      commitCart(current.map((i) => (i.slug === slug && i.size === size ? { ...i, qty: clamped } : i)));
      return clamped;
    },
    [commitCart, stockOf],
  );

  const removeFromCart = useCallback(
    (slug: string, size: string) => commitCart(cartRef.current.filter((i) => !(i.slug === slug && i.size === size))),
    [commitCart],
  );

  const clearCart = useCallback(() => commitCart([]), [commitCart]);

  const removeFromWishlist = useCallback(
    (slug: string) => {
      const next = wishlistRef.current.filter((s) => s !== slug);
      commitWishlist(next);
      // Training bug #2: with BUG_MODE the header badge is not decreased until reload.
      if (!bugMode) setWishlistBadge(next.length);
    },
    [bugMode, commitWishlist],
  );

  const toggleWishlist = useCallback(
    (slug: string) => {
      if (wishlistRef.current.includes(slug)) {
        removeFromWishlist(slug);
        return false;
      }
      const next = [...wishlistRef.current, slug];
      commitWishlist(next);
      setWishlistBadge((b) => (bugMode ? b + 1 : next.length));
      return true;
    },
    [bugMode, commitWishlist, removeFromWishlist],
  );

  const isWishlisted = useCallback((slug: string) => wishlist.includes(slug), [wishlist]);

  const addRecent = useCallback((slug: string) => {
    const next = [slug, ...recentRef.current.filter((s) => s !== slug)].slice(0, 6);
    recentRef.current = next;
    setRecent(next);
    writeJson(LS_RECENT, next);
  }, []);

  const setCoupon = useCallback((code: string | null) => {
    setCouponState(code);
    try {
      if (code) window.localStorage.setItem(LS_COUPON, code);
      else window.localStorage.removeItem(LS_COUPON);
    } catch {
      // ignore
    }
  }, []);

  const refreshStock = useCallback(async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: { slug: string; stock: number }[] };
      const map = Object.fromEntries(data.items.map((p) => [p.slug, p.stock]));
      stockRef.current = map;
      setStockMap(map);
    } catch {
      // keep previous stock
    }
  }, []);

  const showToast = useCallback((text: string, kind: ToastMsg["kind"] = "success") => {
    toastId.current += 1;
    setToast({ id: toastId.current, text, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  const value = useMemo<ShopCtx>(
    () => ({
      ready,
      bugMode,
      user,
      setUser,
      cart,
      cartCount,
      addToCart,
      setCartQty,
      removeFromCart,
      clearCart,
      wishlist,
      wishlistCount: wishlistBadge,
      isWishlisted,
      toggleWishlist,
      removeFromWishlist,
      recent,
      addRecent,
      coupon,
      setCoupon,
      stockOf,
      stockMap,
      refreshStock,
      toast,
      showToast,
    }),
    [
      ready,
      bugMode,
      user,
      cart,
      cartCount,
      addToCart,
      setCartQty,
      removeFromCart,
      clearCart,
      wishlist,
      wishlistBadge,
      isWishlisted,
      toggleWishlist,
      removeFromWishlist,
      recent,
      addRecent,
      coupon,
      setCoupon,
      stockOf,
      stockMap,
      refreshStock,
      toast,
      showToast,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShop(): ShopCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShop must be used inside <ShopProvider>");
  return ctx;
}

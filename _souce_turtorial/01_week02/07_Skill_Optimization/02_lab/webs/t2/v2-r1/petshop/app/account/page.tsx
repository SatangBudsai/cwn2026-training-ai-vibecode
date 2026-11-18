import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SmartImage } from "@/components/SmartImage";
import { currentUser } from "@/lib/auth";
import { ordersFor } from "@/lib/orders";
import { formatBaht } from "@/lib/pricing";

export const metadata: Metadata = { title: "บัญชีของฉัน" };

const PET_TEXT = { cat: "ทาสแมว 🐱", dog: "ทาสหมา 🐶", both: "ทาสทั้งแมวและหมา 🐱🐶" } as const;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  const sp = await searchParams;
  const welcome = sp.welcome === "1";
  const orders = ordersFor(user.id);
  const totalSpent = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="container page account-page">
      {welcome ? (
        <div className="welcome-banner" data-testid="welcome-banner" role="status">
          <span className="wb-emoji" aria-hidden="true">
            🎉
          </span>
          ยินดีต้อนรับ {user.name}!
        </div>
      ) : null}

      <div className="account-grid">
        <section className="profile-card" data-testid="profile-card">
          <SmartImage src="/images/brand/account.jpg" alt="ภาพประกอบบัญชีสมาชิก" emoji="🐾" tone="teal" className="profile-cover" />
          <div className="profile-avatar" aria-hidden="true">
            {user.name.trim().charAt(0) || "🐾"}
          </div>
          <h1 className="profile-name">{user.name}</h1>
          <p className="muted">{user.email}</p>
          <p className="pet-pill">{PET_TEXT[user.pet]}</p>
          <dl className="profile-stats">
            <div>
              <dt>คำสั่งซื้อ</dt>
              <dd>{orders.length}</dd>
            </div>
            <div>
              <dt>ยอดซื้อสะสม</dt>
              <dd>{formatBaht(totalSpent)}</dd>
            </div>
          </dl>
        </section>

        <section className="card-panel" data-testid="order-history">
          <h2>📜 ประวัติการสั่งซื้อ</h2>
          {orders.length === 0 ? (
            <div className="empty-state small" data-testid="no-orders">
              <span className="empty-emoji" aria-hidden="true">
                🧾
              </span>
              <p>ยังไม่มีคำสั่งซื้อ</p>
              <Link href="/products" className="btn btn-primary btn-sm">
                เริ่มช้อปเลย
              </Link>
            </div>
          ) : (
            <ul className="order-list">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="order-row" data-testid="order-row" data-order-id={o.id}>
                    <span className="or-id">{o.id}</span>
                    <span className="or-items">{o.items.reduce((s, i) => s + i.qty, 0)} ชิ้น</span>
                    <span className="or-status">รับคำสั่งซื้อ</span>
                    <strong className="or-total">{formatBaht(o.total)}</strong>
                    <span aria-hidden="true">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

"use client";

import { useMemo, type ReactNode } from "react";
import { clientBugMode } from "@/lib/bugmode";
import { computeTotals, formatBaht, priceLines, type ShippingMethod, type Totals } from "@/lib/pricing";
import { useShop } from "./ShopProvider";

export function useCartTotals(shipping: ShippingMethod = "standard") {
  const { cart, coupon, bugMode } = useShop();
  const lines = useMemo(() => priceLines(cart), [cart]);
  const totals = useMemo(
    () => computeTotals({ lines, couponCode: coupon, shipping, bugMode: bugMode || clientBugMode() }),
    [lines, coupon, shipping, bugMode],
  );
  return { lines, totals };
}

export function SummaryRows({ totals, children }: { totals: Totals; children?: ReactNode }) {
  return (
    <dl className="summary-rows">
      <div>
        <dt>ยอดรวมสินค้า</dt>
        <dd data-testid="summary-subtotal">{formatBaht(totals.subtotal)}</dd>
      </div>
      <div className={totals.discount > 0 ? "is-discount" : ""}>
        <dt>
          ส่วนลด{totals.coupon?.ok ? <span className="code-pill">{totals.coupon.code}</span> : null}
        </dt>
        <dd data-testid="summary-discount">{totals.discount > 0 ? formatBaht(-totals.discount) : formatBaht(0)}</dd>
      </div>
      <div>
        <dt>ค่าจัดส่ง</dt>
        <dd data-testid="summary-shipping" className={totals.shipping === 0 ? "free" : ""}>
          {totals.shipping === 0 ? "ฟรี" : formatBaht(totals.shipping)}
        </dd>
      </div>
      {children}
      <div className="summary-total-row">
        <dt>ยอดชำระทั้งหมด</dt>
        <dd data-testid="summary-total">{formatBaht(totals.total)}</dd>
      </div>
    </dl>
  );
}

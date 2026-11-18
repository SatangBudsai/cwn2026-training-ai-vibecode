import type { OrderStatus } from "./schema";

export interface OrderRecord {
  id: string;
  userId: string;
  amountSatang: number;
  currency: "THB";
  description: string;
  status: OrderStatus;
  createdAt: Date;
  paidAt: Date | null;
  refundedAt: Date | null;
}

/** ตาราง payment_events (event_id UNIQUE) ใช้กัน webhook ซ้ำ */
export interface PaymentEventRecord {
  eventId: string;
  receivedAt: Date;
  payloadHash: string;
}

export interface PaymentRepository {
  insertOrder(order: OrderRecord): Promise<void>;
  findOrderById(id: string): Promise<OrderRecord | null>;
  /** compare-and-set: เปลี่ยนสถานะเฉพาะเมื่อสถานะปัจจุบันเท่ากับ from */
  transitionOrderStatus(id: string, from: OrderStatus, to: OrderStatus, at: Date): Promise<boolean>;
  /** คืน false เมื่อ event_id ซ้ำ (ชน unique) */
  insertPaymentEvent(event: PaymentEventRecord): Promise<boolean>;
}

export function createInMemoryPaymentRepository(): PaymentRepository {
  const orders = new Map<string, OrderRecord>();
  const events = new Map<string, PaymentEventRecord>();
  return {
    async insertOrder(order) {
      orders.set(order.id, { ...order });
    },
    async findOrderById(id) {
      const order = orders.get(id);
      return order ? { ...order } : null;
    },
    async transitionOrderStatus(id, from, to, at) {
      const order = orders.get(id);
      if (!order || order.status !== from) return false;
      order.status = to;
      if (to === "paid") order.paidAt = at;
      if (to === "refunded") order.refundedAt = at;
      return true;
    },
    async insertPaymentEvent(event) {
      if (events.has(event.eventId)) return false;
      events.set(event.eventId, event);
      return true;
    },
  };
}

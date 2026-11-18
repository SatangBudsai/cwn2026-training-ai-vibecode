import { Prisma, type PrismaClient } from '@prisma/client';
import type { OrderStatus } from './schema';

export interface OrderRecord {
  id: string;
  memberId: string;
  amountSatang: number;
  description: string;
  status: OrderStatus;
}

export interface OrderRepository {
  create(input: { memberId: string; amountSatang: number; description: string }): Promise<OrderRecord>;
  findById(id: string): Promise<OrderRecord | null>;
  /** อัปเดตแบบมีเงื่อนไข (สถานะต้องเป็น from อยู่) → false = มีคนเปลี่ยนไปก่อน */
  updateStatus(id: string, from: OrderStatus, to: OrderStatus): Promise<boolean>;
}

export interface PaymentEventRepository {
  /** insert ก่อนประมวลผล — คืน false เมื่อ event_id ซ้ำ (เคยรับแล้ว) */
  insertIfNew(input: { eventId: string; orderId: string; type: string; payloadHash: string }): Promise<boolean>;
}

export function createPrismaOrderRepository(db: PrismaClient): OrderRepository {
  return {
    create(input) {
      return db.order.create({ data: input });
    },
    findById(id) {
      return db.order.findUnique({ where: { id } });
    },
    async updateStatus(id, from, to) {
      const result = await db.order.updateMany({ where: { id, status: from }, data: { status: to } });
      return result.count === 1;
    },
  };
}

export function createPrismaPaymentEventRepository(db: PrismaClient): PaymentEventRepository {
  return {
    async insertIfNew(input) {
      try {
        await db.paymentEvent.create({ data: input });
        return true;
      } catch (err: unknown) {
        // P2002 = ชน unique (event_id ซ้ำ) → ไม่ใช่ error, error อื่นโยนต่อ
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false;
        throw err;
      }
    },
  };
}

import { getEnv } from "@/config/env";
import { InMemoryJobQueue } from "@/lib/queue";
import { createAuditService, createInMemoryAuditRepository, type AuditService } from "@/modules/audit";
import { createAuthService, createInMemoryAuthRepository, type AuthService } from "@/modules/auth";
import { createInMemoryMemberRepository, createMemberService, type MemberService } from "@/modules/member";
import { createNotificationService, type NotificationJob, type NotificationService } from "@/modules/notification";
import { createInMemoryPaymentRepository, createPaymentService, type PaymentService } from "@/modules/payment";

/** ประกอบ service ทุกโมดูล (เรียกโมดูลผ่าน index.ts เท่านั้น) */
export interface AppContainer {
  audit: AuditService;
  auth: AuthService;
  members: MemberService;
  notifications: NotificationService;
  payments: PaymentService;
}

function buildContainer(): AppContainer {
  const env = getEnv();
  const audit = createAuditService({ repo: createInMemoryAuditRepository() });
  const notifications = createNotificationService({ queue: new InMemoryJobQueue<NotificationJob>() });
  return {
    audit,
    notifications,
    auth: createAuthService({
      repo: createInMemoryAuthRepository(),
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
      refreshTtlSeconds: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
      audit,
    }),
    members: createMemberService({ repo: createInMemoryMemberRepository(), audit }),
    payments: createPaymentService({
      repo: createInMemoryPaymentRepository(),
      merchantId: env.THAIPAY_MERCHANT_ID,
      webhookSecret: env.THAIPAY_WEBHOOK_SECRET,
      gatewayUrl: env.THAIPAY_GATEWAY_URL,
      appBaseUrl: env.APP_BASE_URL,
      audit,
      notifications,
    }),
  };
}

const globalForContainer = globalThis as unknown as { appContainer?: AppContainer };

export function getContainer(): AppContainer {
  globalForContainer.appContainer ??= buildContainer();
  return globalForContainer.appContainer;
}

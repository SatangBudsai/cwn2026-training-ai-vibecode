import { CLIENT_REFRESH_LEEWAY_SECONDS } from "./schema";

/**
 * ตรรกะฝั่ง client (บทเรียนบั๊ก ShopDee 2025):
 * 1) refresh ล่วงหน้า 60 วินาทีก่อน access หมด
 * 2) refresh ทุกครั้งก่อนพาผู้ใช้ไปหน้า payment gateway
 */
export function shouldRefreshAccessToken(
  accessTokenExpiresAtMs: number,
  nowMs: number,
  leewaySeconds: number = CLIENT_REFRESH_LEEWAY_SECONDS,
): boolean {
  return nowMs >= accessTokenExpiresAtMs - leewaySeconds * 1000;
}

export function msUntilProactiveRefresh(
  accessTokenExpiresAtMs: number,
  nowMs: number,
  leewaySeconds: number = CLIENT_REFRESH_LEEWAY_SECONDS,
): number {
  return Math.max(0, accessTokenExpiresAtMs - leewaySeconds * 1000 - nowMs);
}

export interface GatewayRedirectSteps {
  refreshSession: () => Promise<void>;
  createCheckoutUrl: () => Promise<string>;
  navigate: (url: string) => void;
}

/** ห้ามพาไป gateway โดยไม่ refresh ก่อน */
export async function redirectToPaymentGateway(steps: GatewayRedirectSteps): Promise<string> {
  await steps.refreshSession();
  const url = await steps.createCheckoutUrl();
  steps.navigate(url);
  return url;
}

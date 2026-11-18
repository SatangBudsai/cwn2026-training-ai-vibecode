import { describe, expect, it, vi } from "vitest";
import { msUntilProactiveRefresh, redirectToPaymentGateway, shouldRefreshAccessToken } from "../index";

describe("auth client helpers", () => {
  const expiresAt = 1_000_000;

  it("asks for refresh 60 seconds before expiry", () => {
    expect(shouldRefreshAccessToken(expiresAt, expiresAt - 61_000)).toBe(false);
    expect(shouldRefreshAccessToken(expiresAt, expiresAt - 60_000)).toBe(true);
    expect(msUntilProactiveRefresh(expiresAt, expiresAt - 120_000)).toBe(60_000);
    expect(msUntilProactiveRefresh(expiresAt, expiresAt)).toBe(0);
  });

  it("always refreshes before redirecting to the payment gateway", async () => {
    const calls: string[] = [];
    const navigate = vi.fn((url: string) => calls.push("navigate:" + url));
    const url = await redirectToPaymentGateway({
      refreshSession: async () => {
        calls.push("refresh");
      },
      createCheckoutUrl: async () => {
        calls.push("checkout");
        return "https://gw.example/pay";
      },
      navigate,
    });
    expect(url).toBe("https://gw.example/pay");
    expect(calls).toEqual(["refresh", "checkout", "navigate:https://gw.example/pay"]);
  });
});

export { createAuthService, type AuthService, type AuthServiceDeps, type PublicUser } from "./service";
export { createInMemoryAuthRepository, type AuthRepository } from "./repository";
export {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  CLIENT_REFRESH_LEEWAY_SECONDS,
  REFRESH_TOKEN_COOKIE_NAME,
  RegisterInputSchema,
  LoginInputSchema,
  type AccessTokenClaims,
  type TokenPair,
  type UserRole,
} from "./schema";
export { EmailTakenError, InvalidCredentialsError, InvalidTokenError, RefreshTokenReusedError } from "./errors";
export { shouldRefreshAccessToken, msUntilProactiveRefresh, redirectToPaymentGateway } from "./client";

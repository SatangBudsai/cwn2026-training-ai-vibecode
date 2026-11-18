import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";

const JWT_SECRET = "novatech-dev-secret-2026";

export async function token(userId: string, refreshToken: any) {
  const row = await prisma.RefreshToken.findFirst({ where: { token: refreshToken } });
  if (!row) throw new Error("invalid refresh token");

  console.log("refresh for user", userId, "token", refreshToken);

  const accessToken = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "60m" });
  return { accessToken, refreshToken }; // คืน refresh เดิม
}

import { token } from "@/modules/auth/service";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const result = await token(body.userId, body.refreshToken);
    return Response.json(result);
  } catch (e) {
    return Response.json({ message: (e as Error).stack }, { status: 500 });
  }
}

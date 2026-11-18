import { handleChat } from '@/lib/chat';
import { json, readJson, withApi } from '@/lib/errors';
import type { ChatResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (req, _ctx, locale) => {
  const body = await readJson<unknown>(req);
  return json<ChatResponse>(await handleChat(body, locale));
});

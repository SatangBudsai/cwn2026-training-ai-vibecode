import { listCategories, listRestaurants, roomState } from "@/lib/server";
import { storageMode, subscribe } from "@/lib/store";

// Realtime updates with Server-Sent Events.
// GET /api/events?room=CODE -> "room" events (votes, filters, draws) + "restaurants" events (edits, eaten)
// GET /api/events           -> "restaurants" events only
// Both start with the current state right after connecting.
export async function GET(req: Request) {
  // Redis mode (Vercel) cannot push across instances: pages poll /api/poll instead
  if (storageMode !== "file") return Response.json({ error: "use /api/poll" }, { status: 404 });
  const code = new URL(req.url).searchParams.get("room")?.toUpperCase() ?? null;
  const enc = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(enc.encode(chunk));
        } catch {
          cleanup(); // client went away
        }
      };
      const send = (event: string, data: unknown) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      // current state on every (re)connect, so a page restored from cache or after a
      // dropped connection never shows stale data
      void (async () => {
        send("restaurants", await listRestaurants());
        if (code) send("room", await roomState(code));
      })();
      const unsubscribe = subscribe((e) => {
        void (async () => {
          if (e.type === "room" && e.code === code) send("room", await roomState(code));
          if (e.type === "restaurants") send("restaurants", await listRestaurants());
          if (e.type === "categories") send("categories", await listCategories());
        })();
      });
      // keep proxies from closing an idle connection
      const ping = setInterval(() => write(": ping\n\n"), 20000);

      cleanup = () => {
        unsubscribe();
        clearInterval(ping);
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

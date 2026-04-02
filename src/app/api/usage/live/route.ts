import { prisma } from "@/lib/prisma";
import { getRawDayStats } from "@/lib/usage";
import type { SSEEvent } from "@/types/usage";

const POLL_INTERVAL_MS = 5_000;
const KEEPALIVE_INTERVAL_MS = 15_000;

export async function GET(req: Request) {
  // 1. Auth check
  const userIdRaw = req.headers.get("x-user-id");
  const userId = Number(userIdRaw);
  if (!userIdRaw || !Number.isInteger(userId) || userId <= 0) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify user exists before opening a long-lived stream
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Get today's date_key (UTC)
  function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // 3. Create ReadableStream with polling logic
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastCommitted = -1;
      let lastReserved = -1;
      let closed = false;

      function sendEvent(event: SSEEvent): void {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      function sendKeepalive(): void {
        if (closed) return;
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }

      function cleanup(): void {
        if (closed) return;
        closed = true;
        clearInterval(pollTimer);
        clearInterval(keepaliveTimer);
        try {
          controller.close();
        } catch {
          // Stream may already be closed
        }
      }

      async function poll(): Promise<void> {
        if (closed) return;
        try {
          const stats = await getRawDayStats(userId, todayKey());
          if (
            stats.committed !== lastCommitted ||
            stats.reserved !== lastReserved
          ) {
            lastCommitted = stats.committed;
            lastReserved = stats.reserved;
            sendEvent({
              type: "update",
              date: todayKey(),
              committed: stats.committed,
              reserved: stats.reserved,
            });
          }
        } catch {
          // DB error during poll → send error event, close stream
          if (!closed) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", message: "Poll failed" })}\n\n`
              )
            );
          }
          cleanup();
        }
      }

      // Send initial state immediately
      await poll();

      const pollTimer = setInterval(poll, POLL_INTERVAL_MS);
      const keepaliveTimer = setInterval(sendKeepalive, KEEPALIVE_INTERVAL_MS);

      // Clean up on client disconnect
      req.signal.addEventListener("abort", () => {
        cleanup();
      });
    },
  });

  // 4. Return Response with SSE headers
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      // X-Accel-Buffering: "no" tells Nginx (and Railway's reverse proxy) to
      // disable response buffering for this endpoint. Without it, Nginx collects
      // chunks into larger buffers before forwarding, which defeats SSE's
      // real-time delivery — events arrive in delayed batches instead of instantly.
      "X-Accel-Buffering": "no",
    },
  });
}

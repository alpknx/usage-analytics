import { prisma } from "@/lib/prisma";
import { getRawDayStats } from "@/lib/usage";
import { getUserId } from "@/lib/auth";
import type { SSEEvent } from "@/types/usage";

const POLL_INTERVAL_MS = 5_000;
const KEEPALIVE_INTERVAL_MS = 15_000;
const MAX_STREAM_LIFETIME_MS = 30 * 60 * 1000; // 30 minutes

export async function GET(req: Request) {
  // 1. Auth check: header x-user-id or query param ?userId=
  const parsedUserId = getUserId(req);
  if (!parsedUserId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const userId: number = parsedUserId;

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
      let lastMaxCreatedAt: Date | null = null;
      let closed = false;

      function send(chunk: string): void {
        if (closed) return;
        controller.enqueue(encoder.encode(chunk));
      }

      function sendEvent(event: SSEEvent): void {
        send(`data: ${JSON.stringify(event)}\n\n`);
      }

      function sendKeepalive(): void {
        send(": keepalive\n\n");
      }

      function cleanup(): void {
        if (closed) return;
        closed = true;
        clearInterval(pollTimer);
        clearInterval(keepaliveTimer);
        clearTimeout(lifetimeTimer);
        try {
          controller.close();
        } catch {
          // Stream may already be closed
        }
      }

      async function poll(): Promise<void> {
        if (closed) return;
        try {
          // Optimization: check if any new events exist before running full groupBy.
          // A single MAX(created_at) lookup on the indexed column is much cheaper.
          const latest = await prisma.dailyUsageEvent.findFirst({
            where: { userId, dateKey: todayKey() },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          });

          // No events at all for today — send zeros if not sent yet
          if (!latest) {
            if (lastCommitted !== 0 || lastReserved !== 0) {
              lastCommitted = 0;
              lastReserved = 0;
              lastMaxCreatedAt = null;
              sendEvent({ type: "update", date: todayKey(), committed: 0, reserved: 0 });
            }
            return;
          }

          // Skip full query if no new rows since last poll
          if (lastMaxCreatedAt && latest.createdAt.getTime() === lastMaxCreatedAt.getTime()) {
            return;
          }
          lastMaxCreatedAt = latest.createdAt;

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
          // DB error during poll → send typed error event, close stream
          sendEvent({ type: "error", message: "Poll failed" });
          cleanup();
        }
      }

      // Send initial state immediately
      await poll();

      const pollTimer = setInterval(poll, POLL_INTERVAL_MS);
      const keepaliveTimer = setInterval(sendKeepalive, KEEPALIVE_INTERVAL_MS);

      // #8: Idle timeout — close stream after MAX_STREAM_LIFETIME_MS.
      // Client will auto-reconnect via useUsageLive hook.
      const lifetimeTimer = setTimeout(cleanup, MAX_STREAM_LIFETIME_MS);

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
      // real-time delivery — events arrives in delayed batches instead of instantly.
      "X-Accel-Buffering": "no",
    },
  });
}

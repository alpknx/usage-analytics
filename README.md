# Fidant.AI Usage Analytics

## Overview

Real-time usage analytics dashboard for Fidant.AI. Tracks daily committed and reserved turns per user, enforces plan-based limits (starter/pro/executive), and provides a live-updating React dashboard with server-side caching, SSE streaming, and a REST API — built on Next.js 14, TypeScript (strict), Prisma, PostgreSQL, Recharts, and Radix UI.

## Features

- **GET /api/usage/stats** — REST endpoint with per-day caching (past days immutable, today TTL = 60s)
- **GET /api/usage/live** — Server-Sent Events endpoint for real-time usage updates (5s poll)
- **UsageStats React component** — stacked bar chart, progress bar, summary cards, period selector
- **daily_usage_cache** — precomputed daily aggregates with staleness-aware TTL logic
- **Docker + Railway** — multi-stage Dockerfile, docker-compose for local dev, one-click Railway deploy

## Setup (Local)

```bash
git clone <repo-url> && cd usage-analytics
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

## Setup (Docker)

```bash
docker compose up --build
```

App at `http://localhost:3000`, PostgreSQL at `localhost:5432`.

## Deploy to Railway

1. Push to GitHub
2. Connect repo in Railway
3. Add a Postgres plugin — Railway sets `DATABASE_URL` automatically
4. Add `DIRECT_URL` env var pointing to the non-pooled connection string
5. Railway auto-deploys on push

## API Reference

| Method | Path | Params | Auth | Response |
|--------|------|--------|------|----------|
| GET | `/api/usage/stats` | `days` (1–90, default 7) | `x-user-id` header | `StatsResponse` JSON |
| GET | `/api/usage/live` | — | `x-user-id` header | SSE stream (`SSEEvent`) |

```bash
# Example
curl -H "x-user-id: 1" "http://localhost:3000/api/usage/stats?days=7"
```

## Assumptions

- Auth is simulated via `x-user-id` header (in prod: NextAuth + OAuth)
- Dates are always UTC (`date_key = "YYYY-MM-DD"` in UTC)
- Cache TTL: past days = immutable, today = 60 seconds
- SSE polling interval: 5 seconds (trade-off: simplicity vs WebSocket overhead)
- Reserved events older than 15 minutes are excluded from counts
- Plan limits: starter = 30, pro = 100, executive = 500 turns/day

## What I'd do differently with more time

- Replace header auth with NextAuth.js + OAuth
- Redis for cache hot paths (avoid DB polling in SSE)
- WebSocket instead of SSE polling for true push
- Stripe webhook → auto-upgrade plan on limit breach
- PostHog events for utilization spikes analytics
- Vitest unit tests for `computeStreak`, `computeSummary`
- Rate limiting on stats endpoint (e.g. Upstash Ratelimit)
- E2E tests with Playwright for the dashboard

## AI tools used

- **Claude (Anthropic)** — used for initial scaffolding of the full project: Prisma schema, TypeScript types, API route handlers, SSE endpoint, React components, Docker and Railway config. Each generated file was reviewed and adjusted — notably the cache invalidation logic (`isCacheStale` with `updatedAt` check), SSE stream cleanup (abort signal + `closed` flag to prevent write-after-close), `groupBy` aggregation in `getRawDayStats`, and reconnect timer cleanup in `useUsageLive`.
- **No Copilot/Cursor** — all code was generated and iterated through Claude Code CLI.

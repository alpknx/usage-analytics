import { z } from "zod";

// ─── Zod schemas for query param validation ────────────────────────

export const StatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

export type StatsQuery = z.infer<typeof StatsQuerySchema>;

// ─── Plan tiers ────────────────────────────────────────────────────

export type PlanTier = "starter" | "pro" | "executive";

export interface UsagePlan {
  tier: PlanTier;
  dailyLimit: number;
}

// ─── Day-level stats ───────────────────────────────────────────────

export interface DayStats {
  date: string; // "YYYY-MM-DD"
  committed: number;
  reserved: number;
  limit: number;
  utilization: number; // committed / limit as 0–1
}

// ─── Summary ───────────────────────────────────────────────────────

export interface PeakDay {
  date: string;
  count: number;
}

export interface Summary {
  total_committed: number;
  avg_daily: number;
  peak_day: PeakDay;
  current_streak: number;
}

// ─── Full API response ─────────────────────────────────────────────

export interface StatsResponse {
  plan: PlanTier;
  daily_limit: number;
  period: {
    from: string;
    to: string;
  };
  days: DayStats[];
  summary: Summary;
}

// ─── Cache row (matches Prisma DailyUsageCache model) ──────────────

export interface CacheRow {
  id: number;
  userId: number;
  dateKey: string;
  committedCount: number;
  reservedCount: number;
  isTodayCache: boolean;
  updatedAt: Date;
}

// ─── SSE event for live endpoint ───────────────────────────────────

export interface SSEEvent {
  type: "update";
  date: string;
  committed: number;
  reserved: number;
}

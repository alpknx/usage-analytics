import type { PlanTier } from "@/types/usage";

export const PLAN_LIMITS: Record<PlanTier, number> = {
  starter: 30,
  pro: 100,
  executive: 500,
} as const;

/** Cache TTL for today's cache row in seconds */
export const CACHE_TTL_SECONDS = 60;

/** Reserved events older than this (minutes) are excluded from counts */
export const STALE_RESERVATION_MINUTES = 15;

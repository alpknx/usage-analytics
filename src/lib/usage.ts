import { prisma } from "@/lib/prisma";
import { CACHE_TTL_SECONDS, STALE_RESERVATION_MINUTES } from "@/lib/constants";
import type { DayStats, Summary, PeakDay } from "@/types/usage";

// ─── Helpers ───────────────────────────────────────────────────────

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function isCacheStale(updatedAt: Date, isToday: boolean): boolean {
  if (!isToday) return false; // past days are immutable
  const ageSeconds = (Date.now() - updatedAt.getTime()) / 1000;
  return ageSeconds > CACHE_TTL_SECONDS;
}

// ─── Raw query for a single day ────────────────────────────────────

export async function getRawDayStats(
  userId: number,
  dateKey: string
): Promise<{ committed: number; reserved: number }> {
  const staleThreshold = new Date(
    Date.now() - STALE_RESERVATION_MINUTES * 60 * 1000
  );

  // Use groupBy to aggregate both types in a single query
  const groups = await prisma.dailyUsageEvent.groupBy({
    by: ["type"],
    where: {
      userId,
      dateKey,
      OR: [
        { type: "committed" },
        { type: "reserved", createdAt: { gte: staleThreshold } },
      ],
    },
    _count: { type: true },
  });

  const committed =
    groups.find((g) => g.type === "committed")?._count.type ?? 0;
  const reserved =
    groups.find((g) => g.type === "reserved")?._count.type ?? 0;

  return { committed, reserved };
}

// ─── Upsert cache row ─────────────────────────────────────────────

export async function upsertCache(
  userId: number,
  dateKey: string,
  data: { committed: number; reserved: number }
): Promise<void> {
  const isToday = dateKey === getTodayKey();
  try {
    await prisma.dailyUsageCache.upsert({
      where: { userId_dateKey: { userId, dateKey } },
      update: {
        committedCount: data.committed,
        reservedCount: data.reserved,
        isTodayCache: isToday,
      },
      create: {
        userId,
        dateKey,
        committedCount: data.committed,
        reservedCount: data.reserved,
        isTodayCache: isToday,
      },
    });
  } catch {
    // Cache write failure is non-fatal — data was already computed
  }
}

// ─── Get stats for a date range ────────────────────────────────────

export async function getStatsForRange(
  userId: number,
  dates: string[],
  limit: number
): Promise<DayStats[]> {
  const todayKey = getTodayKey();

  // Batch-fetch all cached rows for the range
  const cached = await prisma.dailyUsageCache.findMany({
    where: { userId, dateKey: { in: dates } },
  });

  const cacheMap = new Map(cached.map((row) => [row.dateKey, row]));

  const results: DayStats[] = [];

  for (const dateKey of dates) {
    const row = cacheMap.get(dateKey);
    const isToday = dateKey === todayKey;

    if (row && !isCacheStale(row.updatedAt, isToday)) {
      results.push({
        date: dateKey,
        committed: row.committedCount,
        reserved: row.reservedCount,
        limit,
        utilization: limit > 0 ? row.committedCount / limit : 0,
      });
      continue;
    }

    // Cache miss or stale — compute from events
    const raw = await getRawDayStats(userId, dateKey);
    // Fire-and-forget cache write — catch to prevent unhandled rejection
    void upsertCache(userId, dateKey, raw).catch(() => {});

    results.push({
      date: dateKey,
      committed: raw.committed,
      reserved: raw.reserved,
      limit,
      utilization: limit > 0 ? raw.committed / limit : 0,
    });
  }

  return results;
}

// ─── Pure functions ────────────────────────────────────────────────

export function computeStreak(days: DayStats[]): number {
  let streak = 0;
  // days are ordered oldest → newest; walk backwards
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].committed > 0) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function computeSummary(days: DayStats[]): Summary {
  const totalCommitted = days.reduce((sum, d) => sum + d.committed, 0);
  const avgDaily =
    days.length > 0 ? Math.round((totalCommitted / days.length) * 10) / 10 : 0;

  const peakDay: PeakDay = days.reduce<PeakDay>(
    (peak, d) => (d.committed > peak.count ? { date: d.date, count: d.committed } : peak),
    { date: "", count: 0 }
  );

  return {
    total_committed: totalCommitted,
    avg_daily: avgDaily,
    peak_day: peakDay,
    current_streak: computeStreak(days),
  };
}

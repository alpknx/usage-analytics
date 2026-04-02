"use client";

import * as Progress from "@radix-ui/react-progress";
import { useUsageLive } from "@/hooks/useUsageLive";
import type { DayStats } from "@/types/usage";

interface TodayProgressProps {
  userId: number;
  dailyLimit: number;
  todayStats: DayStats;
}

function getBarColor(pct: number): string {
  if (pct > 90) return "bg-red-500";
  if (pct >= 70) return "bg-yellow-500";
  return "bg-green-500";
}

export function TodayProgress({ userId, dailyLimit, todayStats }: TodayProgressProps) {
  const live = useUsageLive(userId);
  const committed = live.connected ? live.committed : todayStats.committed;
  const reserved = live.connected ? live.reserved : todayStats.reserved;
  const pct = dailyLimit > 0 ? Math.min((committed / dailyLimit) * 100, 100) : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {committed} / {dailyLimit} turns used
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          {live.connected && (
            <>
              <span className="relative flex h-2 w-2" role="status" aria-label="Live connection active">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              LIVE
            </>
          )}
        </span>
      </div>

      <Progress.Root
        className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100"
        value={pct}
        aria-label={`Usage: ${committed} of ${dailyLimit} turns`}
      >
        <Progress.Indicator
          className={`h-full transition-all duration-300 ${getBarColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </Progress.Root>

      {reserved > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          <span aria-label={`${reserved} reserved`}>⏳ {reserved} reserved</span>
        </p>
      )}
    </div>
  );
}

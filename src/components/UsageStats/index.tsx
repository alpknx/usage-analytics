"use client";

import { useEffect, useState, useCallback } from "react";
import type { StatsResponse } from "@/types/usage";
import { DailyChart } from "./DailyChart";
import { SummaryCards } from "./SummaryCards";
import { TodayProgress } from "./TodayProgress";
import { DaysSelect } from "./DaysSelect";

interface UsageStatsProps {
  days?: number;
}

export function UsageStats({ days: initialDays = 7 }: UsageStatsProps) {
  const [days, setDays] = useState(initialDays);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/usage/stats?days=${days}&userId=1`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const json: StatsResponse = await res.json();
      setData(json);
    } catch (err) {
      if (err instanceof TypeError) {
        setError("Network error — check your connection");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error");
      }
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-3 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Usage overview</h2>
        <DaysSelect value={days} onChange={setDays} />
      </div>
      <TodayProgress
        dailyLimit={data.daily_limit}
        todayStats={data.days[data.days.length - 1]}
      />
      <SummaryCards summary={data.summary} />
      <DailyChart days={data.days} dailyLimit={data.daily_limit} />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-64 animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
    </div>
  );
}

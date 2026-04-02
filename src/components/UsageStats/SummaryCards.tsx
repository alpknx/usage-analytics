"use client";

import React from "react";
import type { Summary } from "@/types/usage";

interface SummaryCardsProps {
  summary: Summary;
}

interface CardProps {
  title: string;
  value: string | number;
  detail: string;
}

function Card({ title, value, detail }: CardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{detail}</p>
    </div>
  );
}

export const SummaryCards = React.memo(function SummaryCards({
  summary,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card title="Total" value={summary.total_committed} detail="turns used" />
      <Card title="Daily avg" value={summary.avg_daily} detail="per day" />
      <Card
        title="Peak day"
        value={summary.peak_day.count}
        detail={summary.peak_day.date}
      />
      <Card
        title="Streak"
        value={summary.current_streak}
        detail={"🔥 days"}
      />
    </div>
  );
});

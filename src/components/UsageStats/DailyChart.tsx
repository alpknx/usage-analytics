"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { DayStats } from "@/types/usage";

interface DailyChartProps {
  days: DayStats[];
  dailyLimit: number;
}

function formatShortDate(dateKey: string): string {
  const d = new Date(dateKey + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

interface ChartDataPoint {
  date: string;
  committed: number;
  reserved: number;
  limit: number;
  utilization: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: ChartDataPoint }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded border border-gray-200 bg-white p-3 text-sm shadow-lg">
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-blue-500">Committed: {data.committed}</p>
      <p className="text-orange-500">Reserved: {data.reserved}</p>
      <p className="text-red-500">Limit: {data.limit}</p>
      <p className="text-gray-600">Utilization: {data.utilization}%</p>
    </div>
  );
}

export const DailyChart = React.memo(function DailyChart({
  days,
  dailyLimit,
}: DailyChartProps) {
  const chartData = days.map((d) => ({
    date: formatShortDate(d.date),
    committed: d.committed,
    reserved: d.reserved,
    limit: d.limit,
    utilization: Math.round(d.utilization * 100),
  }));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={dailyLimit}
            stroke="#ef4444"
            strokeDasharray="6 3"
            label={{ value: "limit", position: "right", fill: "#ef4444", fontSize: 12 }}
          />
          <Bar
            dataKey="committed"
            stackId="usage"
            fill="#3b82f6"
            name="Committed"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="reserved"
            stackId="usage"
            fill="#f97316"
            name="Reserved"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

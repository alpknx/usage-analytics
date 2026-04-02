import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/constants";
import { StatsQuerySchema } from "@/types/usage";
import type { PlanTier, StatsResponse } from "@/types/usage";
import { getStatsForRange, computeSummary } from "@/lib/usage";

export async function GET(req: Request) {
  // Auth
  const userIdRaw = req.headers.get("x-user-id");
  const userId = Number(userIdRaw);
  if (!userIdRaw || !Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate query params
  const { searchParams } = new URL(req.url);
  const parsed = StatsQuerySchema.safeParse({ days: searchParams.get("days") });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { days } = parsed.data;

  // Look up user plan
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const plan = user.plan as PlanTier;
  const dailyLimit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;

  // Build date range (oldest → newest)
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const dayStats = await getStatsForRange(userId, dates, dailyLimit);
  const summary = computeSummary(dayStats, dailyLimit);

  const response: StatsResponse = {
    plan,
    daily_limit: dailyLimit,
    period: { from: dates[0], to: dates[dates.length - 1] },
    days: dayStats,
    summary,
  };

  return NextResponse.json(response);
}

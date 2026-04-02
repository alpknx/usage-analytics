import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: "demo@fidant.ai" },
    update: {},
    create: { email: "demo@fidant.ai", plan: "pro" },
  });

  console.log(`Seeded user: id=${user.id}, plan=${user.plan}`);

  // Generate 14 days of usage events
  const now = new Date();
  const events: { userId: number; type: string; dateKey: string; createdAt: Date }[] = [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const dateKey = d.toISOString().slice(0, 10);

    // Random committed count (5–40)
    const committedCount = Math.floor(Math.random() * 36) + 5;
    for (let j = 0; j < committedCount; j++) {
      events.push({
        userId: user.id,
        type: "committed",
        dateKey,
        createdAt: new Date(d.getTime() + j * 60_000),
      });
    }

    // A few reserved events for recent days
    if (i <= 1) {
      const reservedCount = Math.floor(Math.random() * 5) + 1;
      for (let j = 0; j < reservedCount; j++) {
        events.push({
          userId: user.id,
          type: "reserved",
          dateKey,
          createdAt: new Date(Date.now() - j * 60_000), // recent timestamps
        });
      }
    }
  }

  await prisma.dailyUsageEvent.deleteMany({ where: { userId: user.id } });
  await prisma.dailyUsageEvent.createMany({ data: events });

  console.log(`Seeded ${events.length} events across 14 days`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

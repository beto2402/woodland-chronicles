// One-time script to seed the first Season, once the add_seasons migration has run.
// Run: node scripts/seed-first-season.mjs
// Idempotent — safe to re-run; does nothing if an open season already exists.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_CADENCE_MONTHS = 1; // monthly; editable immediately via /admin/seasons

const existing = await prisma.season.findFirst({ where: { endDate: null } });

if (existing) {
  console.log(`An open season already exists ("${existing.name}") — skipping seed.`);
} else {
  const earliestGame = await prisma.game.findFirst({
    orderBy: { date: "asc" },
    select: { date: true },
  });
  const startDate = earliestGame?.date ?? new Date();

  const season = await prisma.season.create({
    data: {
      name: "Season 1",
      startDate,
      endDate: null,
      cadenceMonths: DEFAULT_CADENCE_MONTHS,
    },
  });

  console.log(
    `Seeded "${season.name}" starting ${startDate.toISOString().slice(0, 10)} ` +
      `(cadence: ${DEFAULT_CADENCE_MONTHS} month(s)).`,
  );
}

await prisma.$disconnect();

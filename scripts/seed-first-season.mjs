// One-time script to seed the first Season, once the add_seasons migration has run.
// Run: node scripts/seed-first-season.mjs
// Idempotent — safe to re-run; does nothing if an open season already exists.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_CADENCE_MONTHS = 1; // monthly; editable immediately via /admin/seasons

// Mirrors src/lib/season-core.ts#firstOfMonth (kept inline — this script isn't bundled through
// the app's TS build, and it's a two-line function not worth complicating the import for).
function firstOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

const existing = await prisma.season.findFirst({ where: { endDate: null } });

if (existing) {
  console.log(`An open season already exists ("${existing.name}") — skipping seed.`);
} else {
  const earliestGame = await prisma.game.findFirst({
    orderBy: { date: "asc" },
    select: { date: true },
  });
  // Anchored to the 1st of the month, not the exact game date — so every later rollover
  // (which just adds whole months) stays calendar-aligned instead of drifting to whatever day
  // the earliest game happened to land on.
  const startDate = firstOfMonth(earliestGame?.date ?? new Date());

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

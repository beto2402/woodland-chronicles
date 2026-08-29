// One-time correction: the first season was anchored to the earliest game's exact date rather
// than the 1st of that month, so every rollover since (which only adds whole months) drifted to
// that same day-of-month instead of the 1st. Snaps every season's startDate/endDate back to the
// 1st of its own month — safe to re-run (idempotent: snapping an already-aligned date is a no-op).
// Run: node scripts/align-seasons-to-month.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function firstOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

const seasons = await prisma.season.findMany({ orderBy: { startDate: "asc" } });

for (const s of seasons) {
  const startDate = firstOfMonth(s.startDate);
  const endDate = s.endDate ? firstOfMonth(s.endDate) : null;
  if (startDate.getTime() === s.startDate.getTime() && endDate?.getTime() === s.endDate?.getTime()) {
    console.log(`${s.name}: already aligned, skipping.`);
    continue;
  }
  await prisma.season.update({ where: { id: s.id }, data: { startDate, endDate } });
  console.log(
    `${s.name}: ${s.startDate.toISOString().slice(0, 10)}–${s.endDate?.toISOString().slice(0, 10) ?? "present"} ` +
      `→ ${startDate.toISOString().slice(0, 10)}–${endDate?.toISOString().slice(0, 10) ?? "present"}`,
  );
}

await prisma.$disconnect();

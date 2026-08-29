import { prisma } from "@/lib/prisma";
import { computeDueDate } from "@/lib/season-core";
import type { Season } from "@prisma/client";

async function closeAndOpenSeason(current: Season, boundaryDate: Date): Promise<void> {
  const nextName = `Season ${(await prisma.season.count()) + 1}`;
  await prisma.$transaction([
    prisma.season.update({ where: { id: current.id }, data: { endDate: boundaryDate } }),
    prisma.season.create({
      data: {
        name: nextName,
        startDate: boundaryDate,
        endDate: null,
        cadenceMonths: current.cadenceMonths,
      },
    }),
  ]);
}

// Rolls the open season over only if its configured cadence has actually elapsed. Safe to call
// repeatedly (from the daily cron, or right after a cadence edit) — once rolled, the newly
// opened season's own due date is in the future, so a duplicate call is a no-op.
export async function rolloverIfDue(): Promise<{ rolled: boolean }> {
  const current = await prisma.season.findFirst({ where: { endDate: null } });
  if (!current) throw new Error("No open season found");

  const dueDate = computeDueDate(current.startDate, current.cadenceMonths);
  if (new Date() < dueDate) return { rolled: false };

  await closeAndOpenSeason(current, dueDate);
  return { rolled: true };
}

// Closes the open season immediately, regardless of cadence — the admin's manual "end now"
// override.
export async function forceRolloverNow(): Promise<void> {
  const current = await prisma.season.findFirst({ where: { endDate: null } });
  if (!current) throw new Error("No open season found");
  await closeAndOpenSeason(current, new Date());
}

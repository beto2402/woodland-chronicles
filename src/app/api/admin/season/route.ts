import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { rolloverIfDue } from "@/lib/seasons";

export async function GET() {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const current = await prisma.season.findFirst({ where: { endDate: null } });
  const history = await prisma.season.findMany({
    where: { endDate: { not: null } },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ current, history });
}

// Edits the cadence of the currently-open season. Applied live and retroactively: the new
// cadence is measured from the season's existing startDate, so it can push the rollover date
// later OR earlier — including into the past, in which case the season ends right away as part
// of this same request (see rolloverIfDue), rather than waiting for the next cron tick.
export async function PATCH(req: Request) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const cadenceMonths = Number(body?.cadenceMonths);
  if (!Number.isInteger(cadenceMonths) || cadenceMonths < 1) {
    return NextResponse.json({ error: "cadenceMonths must be a positive integer" }, { status: 400 });
  }

  const current = await prisma.season.findFirst({ where: { endDate: null } });
  if (!current) return NextResponse.json({ error: "No open season found" }, { status: 500 });

  await prisma.season.update({ where: { id: current.id }, data: { cadenceMonths } });
  const { rolled } = await rolloverIfDue();

  const updatedCurrent = await prisma.season.findFirst({ where: { endDate: null } });
  const history = await prisma.season.findMany({
    where: { endDate: { not: null } },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ current: updatedCurrent, history, rolled });
}

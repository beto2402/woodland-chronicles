import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { forceRolloverNow } from "@/lib/seasons";

// Manual override: closes the current season immediately, regardless of cadence, and opens the
// next one starting now.
export async function POST() {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await forceRolloverNow();

  const current = await prisma.season.findFirst({ where: { endDate: null } });
  const history = await prisma.season.findMany({
    where: { endDate: { not: null } },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ current, history });
}

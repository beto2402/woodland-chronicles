import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public read — feeds the season selector on each group's leaderboard page.
export async function GET() {
  const seasons = await prisma.season.findMany({ orderBy: { startDate: "desc" } });
  return NextResponse.json(seasons);
}

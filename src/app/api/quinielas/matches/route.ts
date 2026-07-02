import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    orderBy: { matchNumber: "asc" },
    include: {
      picks: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  const result = matches.map((m) => {
    const ended = m.homeScore != null; // result recorded — not just kickoff having passed
    const myPick = m.picks.find((p) => p.userId === session.user.id) ?? null;
    return {
      id: m.id,
      matchNumber: m.matchNumber,
      stage: m.stage,
      groupName: m.groupName,
      homeTeam: m.homeTeam,
      homeTeamPlaceholder: m.homeTeamPlaceholder,
      awayTeam: m.awayTeam,
      awayTeamPlaceholder: m.awayTeamPlaceholder,
      kickoffAt: m.kickoffAt,
      venue: m.venue,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      decidedBy: m.decidedBy,
      penaltyHomeScore: m.penaltyHomeScore,
      penaltyAwayScore: m.penaltyAwayScore,
      winnerTeam: m.winnerTeam,
      ended,
      myPick: myPick
        ? {
            homeScore: myPick.homeScore,
            awayScore: myPick.awayScore,
            decidedBy: myPick.decidedBy,
            penaltyHomeScore: myPick.penaltyHomeScore,
            penaltyAwayScore: myPick.penaltyAwayScore,
          }
        : null,
      // Other players' picks are only visible once the match has ended, so no one can
      // adjust their own pick after seeing someone else's mid-match.
      allPicks: ended
        ? m.picks.map((p) => ({
            userName: p.user.name,
            homeScore: p.homeScore,
            awayScore: p.awayScore,
            decidedBy: p.decidedBy,
            penaltyHomeScore: p.penaltyHomeScore,
            penaltyAwayScore: p.penaltyAwayScore,
          }))
        : [],
    };
  });

  return NextResponse.json(result);
}
